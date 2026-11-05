import { and, asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import type { Executor } from "@/db/types";
import { bouts, cardSegments } from "@/db/schema/events";
import type { BoutStatus } from "@/domain/bout-enums";

/**
 * Orden en que se pelea una noche: los bloques de atrás hacia adelante (preliminares primero, cartelera estelar al
 * final) y, dentro de cada bloque, de la última pelea a la primera (la estelar, que es la primera de la lista, cierra la noche).
 */
export const nightOrderBy = [desc(cardSegments.sortOrder), desc(bouts.sortOrder), asc(bouts.id)] as const;

/** La siguiente pelea sin resultado del evento según el orden de la noche (las canceladas no cuentan). */
export async function getNextPendingBoutId(db: Executor | Db, eventId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: bouts.id })
    .from(bouts)
    .innerJoin(cardSegments, eq(cardSegments.id, bouts.segmentId))
    .where(and(eq(bouts.eventId, eventId), eq(bouts.boutStatus, "scheduled")))
    .orderBy(...nightOrderBy)
    .limit(1);
  return row?.id ?? null;
}

export type NightSegment<T> = { name: string; bouts: T[] };
export type NightBout<T> = T & { segmentName: string };

/**
 * La noche vista desde la cartelera (bloques y peleas en orden de importancia): las pendientes en el orden en que se
 * pelean (la estelar cierra), las terminadas con la más reciente primero y las canceladas aparte.
 */
export function splitNightBouts<T extends { status: BoutStatus }>(
  segments: NightSegment<T>[],
): { pending: NightBout<T>[]; finished: NightBout<T>[]; cancelled: NightBout<T>[] } {
  const inNightOrder = [...segments].reverse().flatMap((segment) => [...segment.bouts].reverse().map((bout) => ({ ...bout, segmentName: segment.name })));
  return {
    pending: inNightOrder.filter((bout) => bout.status === "scheduled"),
    finished: inNightOrder.filter((bout) => bout.status === "completed").reverse(),
    cancelled: inNightOrder.filter((bout) => bout.status === "cancelled"),
  };
}
