import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighters } from "@/db/schema/fighters";
import { addBout, saveSegment } from "@/features/events/card-service";
import { createEvent } from "@/features/events/service";

/** «Cartel Uno» → `uno`: los boxeadores en borrador que crea `e2e/global-setup.ts` para armar carteleras. */
export type CardFighter = "uno" | "dos" | "tres" | "cuatro" | "cinco" | "seis" | "siete" | "ocho";
/** Un boxeador de prueba («uno»…) o el slug completo de cualquier otro («ruth-huaman»). */
export type FighterRef = CardFighter | (string & {});

const slugOf = (fighter: FighterRef) => (fighter.includes("-") ? fighter : `cartel-${fighter}`);

export type E2eCard = { eventId: string; slug: string; boutIds: string[] };

/**
 * Arma un evento publicado (fecha en el futuro) con la cartelera que se pida, directo con los servicios: es mucho más
 * rápido que hacerlo desde el panel y cada spec tiene su propio evento. `layout` va de bloque en bloque, en orden de
 * cartelera (el primero es el estelar): `{ "Cartelera estelar": [["uno", "dos"]], "Preliminares": [["tres", "cuatro"]] }`.
 * La esquina roja es la primera de cada par.
 */
export async function createE2eCard(
  name: string,
  layout: Record<string, [FighterRef, FighterRef][]>,
  options: {
    status?: "draft" | "published";
    startsDate?: string;
    ticketUrl?: string;
    ticketTiers?: { name: string; description: string; priceClp: number; soldOut: boolean }[];
    ticketPoints?: string;
  } = {},
): Promise<E2eCard> {
  const slugs = [...new Set(Object.values(layout).flatMap((pairs) => pairs.flatMap((pair) => pair.map(slugOf))))];
  const rows = slugs.length === 0 ? [] : await db.select({ id: fighters.id, slug: fighters.slug }).from(fighters).where(inArray(fighters.slug, slugs));
  const fighterId = new Map(rows.map((row) => [row.slug, row.id]));
  const [ligero] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.slug, "peso-superligero"));
  if (!ligero) throw new Error("Falta la división Ligero");

  const event = await createEvent(
    db,
    {
      name,
      startsDate: options.startsDate ?? "2031-09-20",
      startsTime: "21:00",
      venueName: "Arena Santiago",
      venueAddress: "Av. Ejemplo 1234",
      venueCity: "Santiago",
      status: options.status ?? "published",
      ticketUrl: options.ticketUrl,
      ticketTiers: options.ticketTiers,
      ticketPoints: options.ticketPoints,
    },
    "e2e",
  );

  const boutIds: string[] = [];
  for (const [segmentName, pairs] of Object.entries(layout)) {
    const segment = await saveSegment(db, event.id, { name: segmentName }, "e2e");
    for (const [red, blue] of pairs) {
      const redId = fighterId.get(slugOf(red));
      const blueId = fighterId.get(slugOf(blue));
      if (!redId || !blueId) throw new Error(`Faltan los boxeadores «${red}» y «${blue}»`);
      boutIds.push((await addBout(db, segment.id, { redFighterId: redId, blueFighterId: blueId, divisionId: ligero.id }, "e2e")).id);
    }
  }
  return { eventId: event.id, slug: event.slug, boutIds };
}
