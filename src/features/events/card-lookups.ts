import { and, asc, eq, inArray, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { divisions } from "@/db/schema/divisions";
import { bouts, cardSegments, events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import type { Executor } from "@/db/types";
import { UserFacingError } from "@/lib/user-facing-error";
import type { BoutData } from "./card-schema";
import { BOUT_NOT_FOUND, EVENT_NOT_FOUND, SEGMENT_NOT_FOUND } from "./event-lock";
import { sortOrderCase } from "./ordering";

// Lecturas y reglas de apoyo de `card-service.ts`. Corren dentro de la transacción que ya bloqueó el evento (`event-lock.ts`).

const fighterName = (fighter: { firstName: string; lastName: string }) => `${fighter.firstName} ${fighter.lastName}`;

export async function findSegment(db: Executor, segmentId: string): Promise<{ id: string; eventId: string; name: string; eventName: string }> {
  const [row] = await db
    .select({ id: cardSegments.id, eventId: cardSegments.eventId, name: cardSegments.name, eventName: events.name, eventDeletedAt: events.deletedAt })
    .from(cardSegments)
    .innerJoin(events, eq(events.id, cardSegments.eventId))
    .where(eq(cardSegments.id, segmentId))
    .limit(1);
  if (!row) throw new UserFacingError(SEGMENT_NOT_FOUND);
  if (row.eventDeletedAt) throw new UserFacingError(EVENT_NOT_FOUND);
  return row;
}

/** Quién pelea y en qué división: lo que se valida al armar (o reponer) una pelea. */
export type BoutMatchup = Pick<BoutData, "redFighterId" | "blueFighterId" | "divisionId">;

type BoutSummary = {
  id: string;
  eventId: string;
  segmentId: string;
  hasResult: boolean;
  isCancelled: boolean;
  label: string;
  eventName: string;
  matchup: BoutMatchup;
};

/** La pelea, si su evento no está en la papelera, con «Pérez vs Soto» para los mensajes de auditoría. */
export async function findBout(db: Executor, boutId: string): Promise<BoutSummary> {
  const red = alias(fighters, "red_fighter");
  const blue = alias(fighters, "blue_fighter");
  const [row] = await db
    .select({
      id: bouts.id,
      eventId: bouts.eventId,
      segmentId: bouts.segmentId,
      boutStatus: bouts.boutStatus,
      outcome: bouts.outcome,
      redFighterId: bouts.redFighterId,
      blueFighterId: bouts.blueFighterId,
      divisionId: bouts.divisionId,
      redLastName: red.lastName,
      blueLastName: blue.lastName,
      eventName: events.name,
      eventDeletedAt: events.deletedAt,
    })
    .from(bouts)
    .innerJoin(events, eq(events.id, bouts.eventId))
    .innerJoin(red, eq(red.id, bouts.redFighterId))
    .innerJoin(blue, eq(blue.id, bouts.blueFighterId))
    .where(eq(bouts.id, boutId))
    .limit(1);
  if (!row) throw new UserFacingError(BOUT_NOT_FOUND);
  if (row.eventDeletedAt) throw new UserFacingError(EVENT_NOT_FOUND);
  return {
    id: row.id,
    eventId: row.eventId,
    segmentId: row.segmentId,
    hasResult: row.boutStatus === "completed" || row.outcome !== null,
    isCancelled: row.boutStatus === "cancelled",
    label: `${row.redLastName} vs ${row.blueLastName}`,
    eventName: row.eventName,
    matchup: { redFighterId: row.redFighterId, blueFighterId: row.blueFighterId, divisionId: row.divisionId },
  };
}

export async function orderedBoutIds(db: Executor, segmentId: string, except?: string): Promise<string[]> {
  const rows = await db
    .select({ id: bouts.id })
    .from(bouts)
    .where(except ? and(eq(bouts.segmentId, segmentId), ne(bouts.id, except)) : eq(bouts.segmentId, segmentId))
    .orderBy(asc(bouts.sortOrder), asc(bouts.id));
  return rows.map((row) => row.id);
}

export async function orderedSegmentIds(db: Executor, eventId: string, except?: string): Promise<string[]> {
  const rows = await db
    .select({ id: cardSegments.id })
    .from(cardSegments)
    .where(except ? and(eq(cardSegments.eventId, eventId), ne(cardSegments.id, except)) : eq(cardSegments.eventId, eventId))
    .orderBy(asc(cardSegments.sortOrder), asc(cardSegments.id));
  return rows.map((row) => row.id);
}

export async function writeSegmentOrder(db: Executor, ids: string[]): Promise<void> {
  if (ids.length > 0) await db.update(cardSegments).set({ sortOrder: sortOrderCase(cardSegments.id, ids) }).where(inArray(cardSegments.id, ids));
}

export async function writeBoutOrder(db: Executor, segmentId: string, ids: string[]): Promise<void> {
  if (ids.length > 0) await db.update(bouts).set({ segmentId, sortOrder: sortOrderCase(bouts.id, ids) }).where(inArray(bouts.id, ids));
}

/**
 * Reglas de una pelea: dos boxeadores distintos, existentes y fuera de la papelera (un borrador sí puede pelear),
 * ninguno con otra pelea vigente en el mismo evento, y una división que exista. Devuelve los nombres para la auditoría.
 * Lee a los boxeadores con `FOR SHARE`: enviar a uno a la papelera (`deleteFighter`, que lo bloquea `FOR UPDATE`) espera a
 * que esta pelea quede guardada y entonces la ve, o termina antes y aquí se lee ya en la papelera.
 */
export async function assertBoutSetup(db: Executor, eventId: string, data: BoutMatchup, exceptBoutId?: string): Promise<string> {
  if (data.redFighterId === data.blueFighterId) throw new UserFacingError("Un boxeador no puede estar en ambas esquinas");

  const ids = [data.redFighterId, data.blueFighterId];
  const rows = await db
    .select({ id: fighters.id, firstName: fighters.firstName, lastName: fighters.lastName, deletedAt: fighters.deletedAt })
    .from(fighters)
    .where(inArray(fighters.id, ids))
    .for("share");
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of ids) {
    const fighter = byId.get(id);
    if (!fighter) throw new UserFacingError("No se encontró al boxeador");
    if (fighter.deletedAt) throw new UserFacingError("Ese boxeador está en la papelera");
  }

  // Una pelea cancelada libera a sus boxeadores para otra pelea del mismo evento.
  const booked = await db
    .select({ red: bouts.redFighterId, blue: bouts.blueFighterId })
    .from(bouts)
    .where(
      and(
        eq(bouts.eventId, eventId),
        ne(bouts.boutStatus, "cancelled"),
        or(inArray(bouts.redFighterId, ids), inArray(bouts.blueFighterId, ids)),
        exceptBoutId ? ne(bouts.id, exceptBoutId) : undefined,
      ),
    );
  for (const id of ids) {
    if (booked.some((row) => row.red === id || row.blue === id)) {
      throw new UserFacingError(`${fighterName(byId.get(id)!)} ya tiene una pelea en este evento`);
    }
  }

  if (data.divisionId) {
    const [division] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.id, data.divisionId)).limit(1);
    if (!division) throw new UserFacingError("Esa división no existe");
  }
  return `${byId.get(data.redFighterId)!.lastName} vs ${byId.get(data.blueFighterId)!.lastName}`;
}
