"use server";

import { z } from "zod";
import { db } from "@/db";
import { zodFieldErrors, type FormActionState } from "@/lib/form-errors";
import { listAdminFighters } from "@/features/fighters/admin-queries";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { getBoutEventId, getSegmentEventId } from "./admin-queries";
import {
  addBout,
  cancelBout,
  deleteBout,
  deleteSegment,
  moveBout,
  reinstateBout,
  reorderSegments,
  saveSegment,
  updateBout,
} from "./card-service";
import { boutInputSchema, type BoutRawInput, type SegmentRawInput } from "./card-schema";
import { revalidateEventPanel, withEventRevalidation } from "./revalidate";
import { eventIdSchema } from "./schema";

const SEGMENT_NOT_FOUND: FormActionState = { error: "No se encontró el bloque" };
const BOUT_NOT_FOUND: FormActionState = { error: "No se encontró la pelea" };
const EVENT_NOT_FOUND: FormActionState = { error: "No se encontró el evento" };

const isId = (id: unknown): id is string => eventIdSchema.safeParse(id).success;
const run = (task: () => Promise<FormActionState | void>) => runFormAction("Error en la cartelera", task);

/** Errores por campo del diálogo de pelea, antes de tocar la base (el servicio vuelve a validar). */
function invalidBout(input: BoutRawInput): FormActionState | null {
  const parsed = boutInputSchema.safeParse(input);
  return parsed.success ? null : { fieldErrors: zodFieldErrors(parsed.error) };
}

export async function saveSegmentAction(eventId: string, input: SegmentRawInput): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(eventId)) return EVENT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => saveSegment(db, eventId, input, admin.userId));
    revalidateEventPanel();
    return { success: "Bloque guardado" };
  });
}

export async function deleteSegmentAction(segmentId: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(segmentId)) return SEGMENT_NOT_FOUND;
  const eventId = await getSegmentEventId(db, segmentId);
  if (!eventId) return SEGMENT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => deleteSegment(db, segmentId, admin.userId));
    revalidateEventPanel();
    return { success: "Bloque eliminado" };
  });
}

export async function reorderSegmentsAction(eventId: string, ids: string[]): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(eventId)) return EVENT_NOT_FOUND;
  const parsed = z.array(z.uuid()).safeParse(ids);
  if (!parsed.success) return { error: "La lista de bloques cambió: recarga la página e inténtalo de nuevo" };

  return run(async () => {
    await withEventRevalidation(eventId, () => reorderSegments(db, eventId, parsed.data, admin.userId));
    revalidateEventPanel();
    return { success: "Orden guardado" };
  });
}

export async function addBoutAction(segmentId: string, input: BoutRawInput): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(segmentId)) return SEGMENT_NOT_FOUND;
  const invalid = invalidBout(input);
  if (invalid) return invalid;
  const eventId = await getSegmentEventId(db, segmentId);
  if (!eventId) return SEGMENT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => addBout(db, segmentId, input, admin.userId));
    revalidateEventPanel();
    return { success: "Pelea agregada" };
  });
}

export async function updateBoutAction(boutId: string, input: BoutRawInput): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(boutId)) return BOUT_NOT_FOUND;
  const invalid = invalidBout(input);
  if (invalid) return invalid;
  const eventId = await getBoutEventId(db, boutId);
  if (!eventId) return BOUT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => updateBout(db, boutId, input, admin.userId));
    revalidateEventPanel();
    return { success: "Pelea guardada" };
  });
}

/** Mueve la pelea a la posición `index` del bloque (arrastrar y soltar, o los botones subir/bajar/mover). */
export async function moveBoutAction(boutId: string, segmentId: string, index: number): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(boutId)) return BOUT_NOT_FOUND;
  if (!isId(segmentId)) return SEGMENT_NOT_FOUND;
  if (!Number.isInteger(index) || index < 0) return { error: "Posición no válida" };
  const eventId = await getBoutEventId(db, boutId);
  if (!eventId) return BOUT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => moveBout(db, boutId, { segmentId, index }, admin.userId));
    revalidateEventPanel();
    return { success: "Orden guardado" };
  });
}

export async function cancelBoutAction(boutId: string, reason: string | null): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(boutId)) return BOUT_NOT_FOUND;
  const eventId = await getBoutEventId(db, boutId);
  if (!eventId) return BOUT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => cancelBout(db, boutId, typeof reason === "string" ? reason : null, admin.userId));
    revalidateEventPanel();
    return { success: "Pelea cancelada" };
  });
}

export async function reinstateBoutAction(boutId: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(boutId)) return BOUT_NOT_FOUND;
  const eventId = await getBoutEventId(db, boutId);
  if (!eventId) return BOUT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => reinstateBout(db, boutId, admin.userId));
    revalidateEventPanel();
    return { success: "Pelea repuesta" };
  });
}

export async function deleteBoutAction(boutId: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isId(boutId)) return BOUT_NOT_FOUND;
  const eventId = await getBoutEventId(db, boutId);
  if (!eventId) return BOUT_NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(eventId, () => deleteBout(db, boutId, admin.userId));
    revalidateEventPanel();
    return { success: "Pelea eliminada" };
  });
}

export type FighterSearchResult = {
  id: string;
  name: string;
  nickname: string | null;
  divisionName: string;
  nationality: string;
  status: "draft" | "scheduled" | "published";
  careerStatus: "active" | "inactive" | "retired";
};

const SEARCH_RESULTS = 10;

/** Buscador del armador: hasta 10 boxeadores por nombre, apellido o apodo (sin traer los 500 al navegador). */
export async function searchFightersForBoutAction(query: string): Promise<FighterSearchResult[]> {
  await requireAdmin();
  const text = typeof query === "string" ? query.trim().slice(0, 60) : "";
  if (text.length < 2) return [];
  const { items } = await listAdminFighters(db, { q: text }, { pageSize: SEARCH_RESULTS });
  return items.map((fighter) => ({
    id: fighter.id,
    name: `${fighter.firstName} ${fighter.lastName}`,
    nickname: fighter.nickname,
    divisionName: fighter.divisionName,
    nationality: fighter.nationality,
    status: fighter.status,
    careerStatus: fighter.careerStatus,
  }));
}
