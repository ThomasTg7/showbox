import { and, count, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { bouts, cardSegments } from "@/db/schema/events";
import { logAudit } from "@/features/audit/log";
import { completeEventIfDone } from "@/features/results/completion";
import { fromLocalInputs, toLocalInputs } from "@/lib/local-time";
import { UserFacingError } from "@/lib/user-facing-error";
import { assertBoutSetup, findBout, findSegment, orderedBoutIds, orderedSegmentIds, writeBoutOrder, writeSegmentOrder } from "./card-lookups";
import { boutInputSchema, cancelReasonSchema, segmentInputSchema, type BoutData, type BoutRawInput, type SegmentRawInput } from "./card-schema";
import { SEGMENT_NOT_FOUND, lockEvent, lockEventOfBout, lockEventOfSegment } from "./event-lock";

// Bloques y peleas de la cartelera. Cada bloque y cada pelea guarda `sort_order` contiguo (0..n-1): toda operación
// que mueve o quita algo reescribe el orden de los bloques afectados en el mismo UPDATE. Cada escritura corre en una
// transacción que primero bloquea el evento (`event-lock.ts`), así dos admins a la vez no se pisan.

const CLEAR_RESULT_FIRST = "Primero borra el resultado";

function firstMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}

// ── Bloques ──────────────────────────────────────────────────────────────────────────────────────

/** Crea un bloque al final o, con `id`, lo renombra. La hora (HH:mm, Ecuador) es la del día del evento; vacía la quita. */
export async function saveSegment(db: Db, eventId: string, input: SegmentRawInput, actorId: string): Promise<{ id: string }> {
  const parsed = segmentInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(firstMessage(parsed.error));
  const { id, name, startsTime } = parsed.data;

  return db.transaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    const startsAt = startsTime ? fromLocalInputs(toLocalInputs(event.startsAt).date, startsTime) : null;

    if (id) {
      const [updated] = await tx
        .update(cardSegments)
        .set({ name, startsAt })
        .where(and(eq(cardSegments.id, id), eq(cardSegments.eventId, eventId)))
        .returning({ id: cardSegments.id });
      if (!updated) throw new UserFacingError(SEGMENT_NOT_FOUND);
      await logAudit(tx, { actorId, action: "update", entityType: "card_segment", entityId: id, summary: `Editó el bloque «${name}» de ${event.name}` });
      return { id };
    }

    const [{ total }] = await tx.select({ total: count() }).from(cardSegments).where(eq(cardSegments.eventId, eventId));
    const [created] = await tx.insert(cardSegments).values({ eventId, name, sortOrder: total ?? 0, startsAt }).returning({ id: cardSegments.id });
    if (!created) throw new UserFacingError("No se pudo guardar el bloque");
    await logAudit(tx, { actorId, action: "create", entityType: "card_segment", entityId: created.id, summary: `Agregó el bloque «${name}» a ${event.name}` });
    return { id: created.id };
  });
}

/** Solo un bloque sin peleas se puede eliminar. */
export async function deleteSegment(db: Db, segmentId: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockEventOfSegment(tx, segmentId);
    const segment = await findSegment(tx, segmentId);
    const [{ total }] = await tx.select({ total: count() }).from(bouts).where(eq(bouts.segmentId, segmentId));
    if ((total ?? 0) > 0) throw new UserFacingError("Primero mueve o elimina las peleas de este bloque");

    await tx.delete(cardSegments).where(eq(cardSegments.id, segmentId));
    await writeSegmentOrder(tx, await orderedSegmentIds(tx, segment.eventId));
    await logAudit(tx, { actorId, action: "delete", entityType: "card_segment", entityId: segmentId, summary: `Eliminó el bloque «${segment.name}» de ${segment.eventName}` });
  });
}

/** `ids` debe ser exactamente la lista de bloques del evento, en el orden nuevo. */
export async function reorderSegments(db: Db, eventId: string, ids: string[], actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    const current = await orderedSegmentIds(tx, eventId);
    if (ids.length !== current.length || new Set(ids).size !== ids.length || ids.some((id) => !current.includes(id))) {
      throw new UserFacingError("La lista de bloques cambió: recarga la página e inténtalo de nuevo");
    }
    await writeSegmentOrder(tx, ids);
    await logAudit(tx, { actorId, action: "update", entityType: "event", entityId: eventId, summary: `Reordenó los bloques de ${event.name}` });
  });
}

// ── Peleas ───────────────────────────────────────────────────────────────────────────────────────

function parseBout(input: BoutRawInput): BoutData {
  const parsed = boutInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(firstMessage(parsed.error));
  return parsed.data;
}

function boutColumns(data: BoutData) {
  return {
    redFighterId: data.redFighterId,
    blueFighterId: data.blueFighterId,
    divisionId: data.divisionId,
    catchweightKg: data.catchweightKg,
    level: data.level,
    scheduledRounds: data.scheduledRounds,
    roundSeconds: data.roundSeconds,
    isTitleFight: data.isTitleFight,
    championCorner: data.championCorner,
  };
}

/** Agrega la pelea al final del bloque. */
export async function addBout(db: Db, segmentId: string, input: BoutRawInput, actorId: string): Promise<{ id: string }> {
  const data = parseBout(input);

  return db.transaction(async (tx) => {
    await lockEventOfSegment(tx, segmentId);
    const segment = await findSegment(tx, segmentId);
    const label = await assertBoutSetup(tx, segment.eventId, data);

    const [{ total }] = await tx.select({ total: count() }).from(bouts).where(eq(bouts.segmentId, segmentId));
    const [created] = await tx
      .insert(bouts)
      .values({ ...boutColumns(data), eventId: segment.eventId, segmentId, sortOrder: total ?? 0 })
      .returning({ id: bouts.id });
    if (!created) throw new UserFacingError("No se pudo guardar la pelea");
    await logAudit(tx, { actorId, action: "create", entityType: "bout", entityId: created.id, summary: `Agregó la pelea ${label} a ${segment.eventName}` });
    return { id: created.id };
  });
}

export async function updateBout(db: Db, boutId: string, input: BoutRawInput, actorId: string): Promise<void> {
  const data = parseBout(input);

  await db.transaction(async (tx) => {
    await lockEventOfBout(tx, boutId);
    const bout = await findBout(tx, boutId);
    if (bout.hasResult) throw new UserFacingError("Esta pelea ya tiene resultado: bórralo antes de cambiar la cartelera");
    const label = await assertBoutSetup(tx, bout.eventId, data, boutId);

    await tx.update(bouts).set(boutColumns(data)).where(eq(bouts.id, boutId));
    await logAudit(tx, { actorId, action: "update", entityType: "bout", entityId: boutId, summary: `Editó la pelea ${label} de ${bout.eventName}` });
  });
}

/** Mueve la pelea a la posición `index` de un bloque del mismo evento (`index` mayor al final = al final). */
export async function moveBout(db: Db, boutId: string, target: { segmentId: string; index: number }, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockEventOfBout(tx, boutId);
    const bout = await findBout(tx, boutId);
    const segment = await findSegment(tx, target.segmentId);
    if (segment.eventId !== bout.eventId) throw new UserFacingError(SEGMENT_NOT_FOUND);

    const targetIds = await orderedBoutIds(tx, target.segmentId, boutId);
    const wanted = Number.isFinite(target.index) ? Math.trunc(target.index) : targetIds.length;
    targetIds.splice(Math.min(Math.max(wanted, 0), targetIds.length), 0, boutId);
    await writeBoutOrder(tx, target.segmentId, targetIds);

    if (bout.segmentId !== target.segmentId) await writeBoutOrder(tx, bout.segmentId, await orderedBoutIds(tx, bout.segmentId));
    await logAudit(tx, {
      actorId,
      action: "update",
      entityType: "bout",
      entityId: boutId,
      summary: `Movió la pelea ${bout.label} al bloque «${segment.name}» de ${bout.eventName}`,
    });
  });
}

/** Cancela la pelea (queda en la cartelera con su motivo). Si ya tiene resultado, se borra primero. */
export async function cancelBout(db: Db, boutId: string, reason: string | null, actorId: string): Promise<void> {
  const parsedReason = cancelReasonSchema.safeParse(reason);
  if (!parsedReason.success) throw new UserFacingError(firstMessage(parsedReason.error));

  await db.transaction(async (tx) => {
    await lockEventOfBout(tx, boutId);
    const bout = await findBout(tx, boutId);
    if (bout.hasResult) throw new UserFacingError(CLEAR_RESULT_FIRST);

    await tx.update(bouts).set({ boutStatus: "cancelled", cancelReason: parsedReason.data }).where(eq(bouts.id, boutId));
    await logAudit(tx, { actorId, action: "update", entityType: "bout", entityId: boutId, summary: `Canceló la pelea ${bout.label} de ${bout.eventName}` });
    await completeEventIfDone(tx, bout.eventId, actorId);
  });
}

/** Devuelve a la cartelera una pelea cancelada, si sus boxeadores no pelean ya en otra pelea del evento. */
export async function reinstateBout(db: Db, boutId: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockEventOfBout(tx, boutId);
    const bout = await findBout(tx, boutId);
    if (!bout.isCancelled) return;
    await assertBoutSetup(tx, bout.eventId, bout.matchup, boutId);

    await tx.update(bouts).set({ boutStatus: "scheduled", cancelReason: null }).where(eq(bouts.id, boutId));
    await logAudit(tx, { actorId, action: "update", entityType: "bout", entityId: boutId, summary: `Repuso la pelea ${bout.label} de ${bout.eventName}` });
  });
}

/** Elimina la pelea y deja contiguo el orden del bloque. Con resultado, se borra primero. */
export async function deleteBout(db: Db, boutId: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockEventOfBout(tx, boutId);
    const bout = await findBout(tx, boutId);
    if (bout.hasResult) throw new UserFacingError(CLEAR_RESULT_FIRST);

    await tx.delete(bouts).where(eq(bouts.id, boutId));
    await writeBoutOrder(tx, bout.segmentId, await orderedBoutIds(tx, bout.segmentId));
    await logAudit(tx, { actorId, action: "delete", entityType: "bout", entityId: boutId, summary: `Eliminó la pelea ${bout.label} de ${bout.eventName}` });
    await completeEventIfDone(tx, bout.eventId, actorId);
  });
}
