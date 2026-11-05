"use server";

import { db } from "@/db";
import { getBoutEventId } from "@/features/events/admin-queries";
import { revalidateEventPanel, withEventRevalidation } from "@/features/events/revalidate";
import { eventIdSchema } from "@/features/events/schema";
import { zodFieldErrors, type FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { runUserFacing } from "@/lib/user-facing-error";
import { describeTitleChange, type TitleChangePrompt } from "@/features/rankings/title-change";
import { boutResultInputSchema } from "./schema";
import { clearBoutResult, overturnResult, recordBoutResult, startLiveEvent } from "./service";

const BOUT_NOT_FOUND: FormActionState = { error: "No se encontró la pelea" };
const EVENT_NOT_FOUND: FormActionState = { error: "No se encontró el evento" };

const isId = (id: unknown): id is string => eventIdSchema.safeParse(id).success;
const run = (task: () => Promise<FormActionState | void>) => runFormAction("Error en los resultados", task);

/** Lo que devuelve guardar un resultado: la consola en vivo avanza a `nextBoutId`; `titleChange` es la pregunta de confirmar al nuevo campeón. */
export type RecordResultState = FormActionState & { titleChange?: TitleChangePrompt | null; nextBoutId?: string | null };

/** Guarda o corrige el resultado. Las reglas del resultado devuelven un error por campo; nada se guarda. */
export async function recordBoutResultAction(boutId: string, input: unknown): Promise<RecordResultState> {
  const admin = await requireAdmin();
  if (!isId(boutId)) return BOUT_NOT_FOUND;
  const parsed = boutResultInputSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const eventId = await getBoutEventId(db, boutId);
  if (!eventId) return BOUT_NOT_FOUND;

  const result = await runUserFacing("Error al guardar el resultado", async () => {
    const outcome = await withEventRevalidation(eventId, () => recordBoutResult(db, boutId, parsed.data, admin.userId));
    // Se compara con el campeón guardado: si ya es ese boxeador (una corrección tras confirmar), no se vuelve a preguntar.
    const titleChange = outcome.ok && outcome.titleChange ? await describeTitleChange(db, outcome.titleChange) : null;
    return { outcome, titleChange };
  });
  if ("error" in result) return { error: result.error };
  const { outcome, titleChange } = result.value;
  if (!outcome.ok) return { fieldErrors: outcome.errors };

  revalidateEventPanel();
  return { success: "Resultado guardado", titleChange, nextBoutId: outcome.nextBoutId };
}

export async function clearBoutResultAction(boutId: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(boutId)) return BOUT_NOT_FOUND;
  const eventId = await getBoutEventId(db, boutId);
  if (!eventId) return BOUT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => clearBoutResult(db, boutId, admin.userId));
    revalidateEventPanel();
    return { success: "Resultado borrado" };
  });
}

export async function overturnResultAction(boutId: string, note: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(boutId)) return BOUT_NOT_FOUND;
  const eventId = await getBoutEventId(db, boutId);
  if (!eventId) return BOUT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => overturnResult(db, boutId, typeof note === "string" ? note : "", admin.userId));
    revalidateEventPanel();
    return { success: "Resultado anulado" };
  });
}

/** Abre la noche de pelea: el evento pasa a «en vivo». */
export async function startLiveEventAction(eventId: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(eventId)) return EVENT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => startLiveEvent(db, eventId, admin.userId));
    revalidateEventPanel();
  });
}
