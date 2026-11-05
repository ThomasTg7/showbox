import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighters } from "@/db/schema/fighters";
import { titles } from "@/db/schema/rankings";
import { divisionTitle } from "@/features/fighters/labels";
import type { TitleChangeCandidate } from "@/features/results/service";

/** Lo que el panel muestra para confirmar un cambio de título. */
export type TitleChangePrompt = {
  candidate: TitleChangeCandidate;
  newChampionName: string;
  divisionLabel: string;
  currentChampionName: string | null;
};

/**
 * Convierte el candidato de `recordBoutResult` en lo que se le pregunta a la persona, comparándolo con el campeón
 * guardado: si ya es ese boxeador (p. ej. se corrigió un resultado después de confirmar) no hay nada que preguntar.
 */
export async function describeTitleChange(db: Db, candidate: TitleChangeCandidate): Promise<TitleChangePrompt | null> {
  const [[newChampion], [division], [title]] = await Promise.all([
    db.select({ firstName: fighters.firstName, lastName: fighters.lastName }).from(fighters).where(eq(fighters.id, candidate.newChampionId)).limit(1),
    db.select({ name: divisions.name, gender: divisions.gender }).from(divisions).where(eq(divisions.id, candidate.divisionId)).limit(1),
    db
      .select({ championId: titles.championFighterId })
      .from(titles)
      .where(and(eq(titles.level, candidate.level), eq(titles.divisionId, candidate.divisionId)))
      .limit(1),
  ]);
  if (!newChampion || !division || title?.championId === candidate.newChampionId) return null;

  let currentChampionName: string | null = null;
  if (title?.championId) {
    const [current] = await db.select({ firstName: fighters.firstName, lastName: fighters.lastName }).from(fighters).where(eq(fighters.id, title.championId)).limit(1);
    currentChampionName = current ? `${current.firstName} ${current.lastName}` : null;
  }
  return { candidate, newChampionName: `${newChampion.firstName} ${newChampion.lastName}`, divisionLabel: divisionTitle(division), currentChampionName };
}
