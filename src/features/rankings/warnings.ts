import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighters } from "@/db/schema/fighters";
import { rankingEntries, titles } from "@/db/schema/rankings";
import type { BoutLevel } from "@/domain/bout-enums";
import { divisionTitle } from "@/features/fighters/labels";
import { visibleRankedFighter } from "./eligibility";
import { listLatestVersions } from "./versions";

type HiddenFighterRow = { name: string; careerStatus: "active" | "inactive" | "retired"; deleted: boolean };

const hiddenFighterColumns = {
  name: sql<string>`${fighters.firstName} || ' ' || ${fighters.lastName}`,
  careerStatus: fighters.careerStatus,
  deleted: sql<boolean>`${fighters.deletedAt} is not null`,
};

/** Por qué un boxeador ya no se muestra en el ranking (en el orden en que importa para la promotora). */
function hiddenReason({ careerStatus, deleted }: Pick<HiddenFighterRow, "careerStatus" | "deleted">): string {
  if (deleted) return "está en la papelera";
  if (careerStatus === "retired") return "está retirado";
  if (careerStatus === "inactive") return "está inactivo";
  return "no está publicado";
}

/**
 * Avisos del panel: boxeadores que están en un ranking vigente (o son campeones) pero ya no se ven en el sitio porque
 * pasaron a retirados, inactivos, borrador o a la papelera. `filter` acota por nivel y división (`null` = libra por libra).
 */
export async function listIneligibleWarnings(db: Db, filter: { level?: BoutLevel; divisionId?: string | null } = {}): Promise<string[]> {
  const latest = await listLatestVersions(db, filter, 1);
  const hidden = sql`not (${visibleRankedFighter})`;
  const [rankedRows, championRows] = await Promise.all([
    latest.length === 0
      ? []
      : db
          .select(hiddenFighterColumns)
          .from(rankingEntries)
          .innerJoin(fighters, eq(fighters.id, rankingEntries.fighterId))
          .where(and(inArray(rankingEntries.versionId, latest.map((version) => version.id)), hidden)),
    filter.divisionId === null
      ? []
      : db
          .select({ ...hiddenFighterColumns, divisionName: divisions.name, divisionGender: divisions.gender })
          .from(titles)
          .innerJoin(fighters, eq(fighters.id, titles.championFighterId))
          .innerJoin(divisions, eq(divisions.id, titles.divisionId))
          .where(and(hidden, filter.level ? eq(titles.level, filter.level) : undefined, filter.divisionId ? eq(titles.divisionId, filter.divisionId) : undefined)),
  ]);

  const warnings = [
    ...rankedRows.map((row) => `${row.name} ${hiddenReason(row)}: quítalo del ranking`),
    ...championRows.map((row) => `${row.name} ${hiddenReason(row)}: deja vacante el título de ${divisionTitle({ name: row.divisionName, gender: row.divisionGender })}`),
  ];
  return [...new Set(warnings)];
}

/** ¿Está el boxeador en un ranking vigente o es campeón? `deleteFighter` lo consulta: sacarlo de la lista pública sin avisar dejaría un puesto vacío. */
export async function getFighterRankingStanding(db: Db, fighterId: string): Promise<"champion" | "ranked" | null> {
  const [title] = await db.select({ id: titles.id }).from(titles).where(eq(titles.championFighterId, fighterId)).limit(1);
  if (title) return "champion";
  const latest = await listLatestVersions(db, {}, 1);
  if (latest.length === 0) return null;
  const [entry] = await db
    .select({ position: rankingEntries.position })
    .from(rankingEntries)
    .where(and(eq(rankingEntries.fighterId, fighterId), inArray(rankingEntries.versionId, latest.map((version) => version.id))))
    .limit(1);
  return entry ? "ranked" : null;
}
