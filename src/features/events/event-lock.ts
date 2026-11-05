import { and, eq, isNull } from "drizzle-orm";
import { bouts, cardSegments, events } from "@/db/schema/events";
import type { Executor } from "@/db/types";
import { UserFacingError } from "@/lib/user-facing-error";

// Toda escritura de cartelera o de resultados de un evento empieza bloqueando la fila del evento (`FOR UPDATE`) dentro de
// su transacción: dos admins a la vez quedan en fila, y la segunda escritura lee lo que dejó la primera (orden contiguo,
// un boxeador sin dos peleas, el evento que cierra con la última pelea). Sin esto, con READ COMMITTED, ambas leen lo mismo.

export const EVENT_NOT_FOUND = "No se encontró el evento";
export const SEGMENT_NOT_FOUND = "No se encontró el bloque";
export const BOUT_NOT_FOUND = "No se encontró la pelea";

/** Bloquea el evento (fuera de la papelera) y devuelve lo que piden los mensajes. Solo dentro de una transacción. */
export async function lockEvent(tx: Executor, eventId: string): Promise<{ id: string; name: string; startsAt: Date }> {
  const [row] = await tx
    .select({ id: events.id, name: events.name, startsAt: events.startsAt })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .for("update");
  if (!row) throw new UserFacingError(EVENT_NOT_FOUND);
  return row;
}

/** Bloquea el evento del bloque y devuelve su id. */
export async function lockEventOfSegment(tx: Executor, segmentId: string): Promise<string> {
  const [row] = await tx
    .select({ eventId: events.id, deletedAt: events.deletedAt })
    .from(cardSegments)
    .innerJoin(events, eq(events.id, cardSegments.eventId))
    .where(eq(cardSegments.id, segmentId))
    .for("update", { of: events });
  if (!row) throw new UserFacingError(SEGMENT_NOT_FOUND);
  if (row.deletedAt) throw new UserFacingError(EVENT_NOT_FOUND);
  return row.eventId;
}

/** Bloquea el evento de la pelea y devuelve su id. */
export async function lockEventOfBout(tx: Executor, boutId: string): Promise<string> {
  const [row] = await tx
    .select({ eventId: events.id, deletedAt: events.deletedAt })
    .from(bouts)
    .innerJoin(events, eq(events.id, bouts.eventId))
    .where(eq(bouts.id, boutId))
    .for("update", { of: events });
  if (!row) throw new UserFacingError(BOUT_NOT_FOUND);
  if (row.deletedAt) throw new UserFacingError(EVENT_NOT_FOUND);
  return row.eventId;
}
