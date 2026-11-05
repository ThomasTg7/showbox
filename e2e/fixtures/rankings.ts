import { eq } from "drizzle-orm";
import { db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { addBout, saveSegment } from "@/features/events/card-service";
import { createEvent } from "@/features/events/service";
import { createFighter } from "@/features/fighters/service";

/**
 * Los e2e de rankings usan divisiones que ningún otro spec toca (Semipesado, Pesado, Medio) y boxeadores propios: así no
 * mueven al campeón ni los puestos del seed, de los que dependen las pruebas del sitio público.
 */
export type RankingDivision = "peso-semipesado" | "peso-pesado" | "peso-mediano";

export async function divisionIdOf(slug: RankingDivision): Promise<string> {
  const [row] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.slug, slug));
  if (!row) throw new Error(`Falta la división ${slug}`);
  return row.id;
}

/** Boxeador publicado, activo y con récord pro (elegible a ranking), de apellido único para encontrarlo en pantalla. */
export async function createRankableFighter(divisionSlug: RankingDivision, firstName: string, lastName: string): Promise<{ id: string; name: string }> {
  const divisionId = await divisionIdOf(divisionSlug);
  const created = await createFighter(
    db,
    { firstName, lastName, gender: "male", nationality: "CL", divisionId, status: "published", proWins: 3 },
    "e2e",
  );
  return { id: created.id, name: `${firstName} ${lastName}` };
}

/** Evento publicado (futuro) con una sola pelea por el título en la división: la esquina roja defiende, la azul es la retadora. */
export async function createTitleFightEvent(
  name: string,
  divisionSlug: RankingDivision,
  redFighterId: string,
  blueFighterId: string,
): Promise<{ eventId: string; slug: string; boutId: string }> {
  const divisionId = await divisionIdOf(divisionSlug);
  const event = await createEvent(
    db,
    { name, startsDate: "2031-09-27", startsTime: "21:00", venueName: "Arena Santiago", venueAddress: "Av. Ejemplo 1234", venueCity: "Santiago", status: "published" },
    "e2e",
  );
  const segment = await saveSegment(db, event.id, { name: "Cartelera estelar" }, "e2e");
  const bout = await addBout(db, segment.id, { redFighterId, blueFighterId, divisionId, isTitleFight: true, championCorner: "red" }, "e2e");
  return { eventId: event.id, slug: event.slug, boutId: bout.id };
}
