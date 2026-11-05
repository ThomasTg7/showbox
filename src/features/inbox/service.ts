import { BRAND } from "@/domain/brand";
import { and, eq, ne } from "drizzle-orm";
import { createElement, type ReactElement } from "react";
import type { z } from "zod";
import { NewApplicationEmail } from "@/emails/new-application";
import { NewSponsorshipEmail } from "@/emails/new-sponsorship";
import type { Db } from "@/db";
import { inboxMessages, type FighterApplicationPayload, type SponsorshipPayload } from "@/db/schema/inbox";
import { logAudit } from "@/features/audit/log";
import { zodFieldErrors } from "@/lib/form-errors";
import type { Mailer } from "@/lib/mailer";
import { toLocalInputs } from "@/lib/local-time";
import { UserFacingError } from "@/lib/user-facing-error";
import { adminOrigin, adminPath } from "@/lib/site-urls";
import { checkRateLimit } from "./rate-limit";
import type { InboxStatus } from "./queries";
import { fighterApplicationSchema, sponsorshipSchema, type FighterApplicationData, type SponsorshipData } from "./schema";

export const RATE_LIMIT_MESSAGE = "Demasiados envíos, intenta más tarde";

export type SubmitDeps = {
  db: Db;
  mailer: Mailer;
  /** Correo que recibe el aviso (Configuración → Contacto). Vacío: el mensaje igual queda en la bandeja, sin correo. */
  notifyEmail: string;
  /** SHA-256 de la IP de quien envía (`hashIp`), para el límite por hora. */
  ipHash: string;
  now?: Date;
};

export type SubmitResult = { ok: true } | { ok: false; errors: Record<string, string> };

type Handler<Data> = {
  kind: "fighter_application" | "sponsorship";
  schema: (today: string) => z.ZodType<Data, unknown>;
  row: (data: Data) => { name: string; email: string; phone: string | null; payload: FighterApplicationPayload | SponsorshipPayload };
  notification: (data: Data, inboxUrl: string) => { subject: string; react: ReactElement };
};

const fighterApplication: Handler<FighterApplicationData> = {
  kind: "fighter_application",
  schema: fighterApplicationSchema,
  row: (data) => ({
    name: data.name,
    email: data.email,
    phone: data.phone,
    payload: { birthDate: data.birthDate, weightKg: data.weightKg, record: data.record, gym: data.gym, videoLinks: data.videoLinks, message: data.message },
  }),
  notification: (data, inboxUrl) => ({ subject: `[${BRAND.name}] Nueva postulación: ${data.name}`, react: createElement(NewApplicationEmail, { application: data, inboxUrl }) }),
};

const sponsorship: Handler<SponsorshipData> = {
  kind: "sponsorship",
  schema: () => sponsorshipSchema,
  row: (data) => ({ name: data.company, email: data.email, phone: data.phone, payload: { contactName: data.contactName, message: data.message } }),
  notification: (data, inboxUrl) => ({ subject: `[${BRAND.name}] Contacto de patrocinio: ${data.company}`, react: createElement(NewSponsorshipEmail, { sponsorship: data, inboxUrl }) }),
};

/**
 * El correo de aviso nunca cambia el resultado: si Resend falla, falta configuración (correo o `ADMIN_URL`) o no hay correo
 * de avisos, el mensaje ya está en la bandeja y quien escribió ve el éxito. El error queda en el log del servidor. El aviso
 * se arma dentro del `try`: armar el enlace al panel también puede fallar.
 */
async function notify(deps: SubmitDeps, buildMessage: () => { subject: string; react: ReactElement }): Promise<void> {
  if (!deps.notifyEmail) return;
  try {
    await deps.mailer.send({ to: deps.notifyEmail, ...buildMessage() });
  } catch (error) {
    console.error("No se pudo enviar el correo de aviso de la bandeja", error);
  }
}

async function submit<Data>(deps: SubmitDeps, input: Record<string, unknown>, handler: Handler<Data>): Promise<SubmitResult> {
  // Campo trampa: un bot lo llena, una persona no lo ve. Se responde éxito para no darle pistas, sin guardar nada.
  if (typeof input.website === "string" && input.website.trim() !== "") return { ok: true };

  const now = deps.now ?? new Date();
  const parsed = handler.schema(toLocalInputs(now).date).safeParse(input);
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error) };
  // Solo cuentan los envíos válidos: corregir un error del formulario no gasta el cupo de la hora.
  if (!(await checkRateLimit(deps.db, deps.ipHash, now))) return { ok: false, errors: { form: RATE_LIMIT_MESSAGE } };

  const [saved] = await deps.db
    .insert(inboxMessages)
    .values({ kind: handler.kind, ...handler.row(parsed.data), consentAt: now })
    .returning({ id: inboxMessages.id });
  await notify(deps, () => handler.notification(parsed.data, `${adminOrigin()}${adminPath(`/bandeja/${saved!.id}`)}`));
  return { ok: true };
}

export function submitFighterApplication(deps: SubmitDeps, input: Record<string, unknown>): Promise<SubmitResult> {
  return submit(deps, input, fighterApplication);
}

export function submitSponsorship(deps: SubmitDeps, input: Record<string, unknown>): Promise<SubmitResult> {
  return submit(deps, input, sponsorship);
}

export const INBOX_STATUS_LABELS: Record<InboxStatus, string> = { new: "nuevo", contacted: "contactado", discarded: "descartado" };

/** Cambia el estado de un mensaje (nuevo, contactado, descartado) y lo deja en el historial. Sin cambio real no escribe nada. */
export async function setInboxStatus(db: Db, id: string, status: InboxStatus, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(inboxMessages)
      .set({ status })
      .where(and(eq(inboxMessages.id, id), ne(inboxMessages.status, status)))
      .returning({ name: inboxMessages.name });
    if (row) {
      await logAudit(tx, { actorId, action: "update", entityType: "inbox", entityId: id, summary: `Marcó como ${INBOX_STATUS_LABELS[status]} el mensaje de ${row.name}` });
      return;
    }
    const [exists] = await tx.select({ id: inboxMessages.id }).from(inboxMessages).where(eq(inboxMessages.id, id)).limit(1);
    if (!exists) throw new UserFacingError("No se encontró el mensaje");
  });
}
