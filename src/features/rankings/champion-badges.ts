import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighters } from "@/db/schema/fighters";
import { titles } from "@/db/schema/rankings";
import { championWord } from "@/domain/rankings";
import { visibleRankedFighter } from "./eligibility";

/**
 * La insignia de cada campeón actual para las tarjetas del listado (`FighterCard badge`): «Campeón»/«Campeona» (pro) o
 * «Campeón amateur». Títulos de divisiones activas (también de un nivel con los puestos ocultos), de boxeadores que se ven; el pro gana si
 * tiene los dos. Una consulta: los títulos son pocos (dos por división).
 */
export async function getChampionBadges(db: Db): Promise<Record<string, string>> {
  const rows = await db
    .select({ fighterId: fighters.id, level: titles.level, gender: divisions.gender })
    .from(titles)
    .innerJoin(divisions, eq(divisions.id, titles.divisionId))
    .innerJoin(fighters, eq(fighters.id, titles.championFighterId))
    .where(and(eq(divisions.active, true), visibleRankedFighter));

  const badges: Record<string, string> = {};
  for (const row of rows.toSorted((a, b) => (a.level === b.level ? 0 : a.level === "pro" ? 1 : -1))) {
    badges[row.fighterId] = row.level === "pro" ? championWord(row.gender) : `${championWord(row.gender)} amateur`;
  }
  return badges;
}
