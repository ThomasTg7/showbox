import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { bouts, cardSegments, events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import type { EventFormInput } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysFromNow(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

let eventCounter = 0;

/** Evento publicado y futuro (en 30 días) con datos mínimos; `overrides` pisa cualquier columna. */
export async function insertEvent(db: Db, overrides: Partial<typeof events.$inferInsert> = {}): Promise<{ id: string; slug: string }> {
  eventCounter += 1;
  const [row] = await db
    .insert(events)
    .values({
      slug: `evento-de-prueba-${eventCounter}`,
      name: `Evento de prueba ${eventCounter}`,
      startsAt: daysFromNow(30),
      venueName: "Arena Santiago",
      venueAddress: "Av. Ejemplo 1234",
      venueCity: "Santiago",
      status: "published",
      ...overrides,
    })
    .returning({ id: events.id, slug: events.slug });
  return row!;
}

export async function insertSegment(db: Db, eventId: string, name = "Cartelera estelar", sortOrder = 0): Promise<string> {
  const [row] = await db.insert(cardSegments).values({ eventId, name, sortOrder }).returning({ id: cardSegments.id });
  return row!.id;
}

type BoutInsert = typeof bouts.$inferInsert;

/** Pelea programada (Ligero, 3 × 5 min por defecto); `overrides` agrega el resultado u otros datos. */
export async function insertBout(
  db: Db,
  input: Pick<BoutInsert, "eventId" | "segmentId" | "redFighterId" | "blueFighterId"> & Partial<BoutInsert>,
): Promise<string> {
  const [row] = await db.insert(bouts).values(input).returning({ id: bouts.id });
  return row!.id;
}

export async function fighterIdBySlug(db: Db, slug: string): Promise<string> {
  const [row] = await db.select({ id: fighters.id }).from(fighters).where(eq(fighters.slug, slug));
  if (!row) throw new Error(`No existe el boxeador ${slug}`);
  return row.id;
}

export async function eventIdBySlug(db: Db, slug: string): Promise<string> {
  const [row] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
  if (!row) throw new Error(`No existe el evento ${slug}`);
  return row.id;
}

/** Evento válido mínimo para los tests del servicio (fecha y hora escritas en Ecuador); `overrides` pisa cualquier campo. */
export function validEventInput(overrides: Partial<EventFormInput> = {}): EventFormInput {
  return {
    name: "ShowBox Fight Night 9",
    startsDate: "2026-11-14",
    startsTime: "21:00",
    venueName: "Arena Santiago",
    venueAddress: "Av. Ejemplo 1234",
    venueCity: "Santiago",
    ...overrides,
  };
}
