import { BRAND } from "@/domain/brand";
import type { ReactNode } from "react";
import type { FighterApplicationPayload, InboxMessage, SponsorshipPayload } from "@/db/schema/inbox";
import { whatsappUrl } from "@/domain/phone";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { isHttpUrl } from "@/lib/zod-fields";
import { INBOX_KIND_LABELS, InboxStatusBadge } from "./inbox-labels";
import { InboxStatusButtons } from "./inbox-status-buttons";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

const LINK_CLASS = "underline underline-offset-4 hover:text-accent-bright";

function ApplicationFields({ payload }: { payload: FighterApplicationPayload }) {
  return (
    <>
      <Field label="Fecha de nacimiento">{formatDate(new Date(`${payload.birthDate}T12:00:00Z`))}</Field>
      <Field label="Peso">{String(payload.weightKg).replace(".", ",")} kg</Field>
      {payload.record ? <Field label="Récord">{payload.record}</Field> : null}
      {payload.gym ? <Field label="Gimnasio">{payload.gym}</Field> : null}
      {payload.videoLinks.length > 0 ? (
        <Field label="Videos">
          <ul className="flex flex-col gap-1">
            {payload.videoLinks.filter(isHttpUrl).map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noopener noreferrer nofollow" className={`${LINK_CLASS} break-all`}>
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </Field>
      ) : null}
      {payload.message ? <Field label="Mensaje">{payload.message}</Field> : null}
    </>
  );
}

function SponsorshipFields({ payload }: { payload: SponsorshipPayload }) {
  return (
    <>
      <Field label="Persona de contacto">{payload.contactName}</Field>
      {payload.message ? <Field label="Mensaje">{payload.message}</Field> : null}
    </>
  );
}

/** Un mensaje de la bandeja completo, con los botones para responder (correo y WhatsApp) y cambiar su estado. */
export function InboxDetail({ message }: { message: InboxMessage }) {
  const isApplication = message.kind === "fighter_application";
  const subject = isApplication ? `${BRAND.name}: tu postulación` : `${BRAND.name}: tu mensaje de patrocinio`;
  const whatsapp = message.phone ? whatsappUrl(message.phone) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <InboxStatusBadge status={message.status} />
        <span className="text-muted-foreground">
          {INBOX_KIND_LABELS[message.kind]} · {formatDateTime(message.createdAt)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a href={`mailto:${message.email}?subject=${encodeURIComponent(subject)}`}>Responder por email</a>
        </Button>
        {whatsapp ? (
          <Button asChild variant="outline">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </Button>
        ) : null}
      </div>
      <InboxStatusButtons id={message.id} status={message.status} />

      <dl>
        <Field label={isApplication ? "Nombre" : "Empresa"}>{message.name}</Field>
        <Field label="Correo">
          <a href={`mailto:${message.email}`} className={`${LINK_CLASS} break-all`}>
            {message.email}
          </a>
        </Field>
        {message.phone ? <Field label="Teléfono">{message.phone}</Field> : null}
        {isApplication ? <ApplicationFields payload={message.payload as FighterApplicationPayload} /> : <SponsorshipFields payload={message.payload as SponsorshipPayload} />}
        <Field label="Privacidad">Aceptó la política de privacidad el {formatDateTime(message.consentAt)}.</Field>
      </dl>
    </div>
  );
}
