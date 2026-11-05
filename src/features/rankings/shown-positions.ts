import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighters } from "@/db/schema/fighters";
import { rankingEntries, titles } from "@/db/schema/rankings";
import { P4P_SLOTS } from "@/domain/rankings";
import { visibleRankedFighter } from "./eligibility";
import type { RankedVersionRow } from "./versions";

/**
 * Los puestos que el sitio muestra de unas versiones: por versión, los boxeadores que se ven, en orden, sin el campeón
 * del alcance y hasta los puestos de hoy (el `índice + 1` es el número). Las divisiones inactivas no muestran nada. Es
 * la misma regla de `/rankings` (`getPublicRankings`), para que la ficha y la cartelera digan el mismo número.
 */
export async function shownRankings(db: Db, versions: Pick<RankedVersionRow, "id" | "level" | "divisionId">[]): Promise<Map<string, string[]>> {
  const shown = new Map<string, string[]>();
  if (versions.length === 0) return shown;
  const divisionIds = [...new Set(versions.flatMap((version) => (version.divisionId ? [version.divisionId] : [])))];
  const [entryRows, titleRows, divisionRows] = await Promise.all([
    db
      .select({ versionId: rankingEntries.versionId, fighterId: rankingEntries.fighterId })
      .from(rankingEntries)
      .innerJoin(fighters, eq(fighters.id, rankingEntries.fighterId))
      .where(and(inArray(rankingEntries.versionId, versions.map((version) => version.id)), visibleRankedFighter))
      .orderBy(asc(rankingEntries.versionId), asc(rankingEntries.position)),
    divisionIds.length === 0
      ? []
      : db
          .select({ level: titles.level, divisionId: titles.divisionId, championId: titles.championFighterId })
          .from(titles)
          .where(and(inArray(titles.divisionId, divisionIds), isNotNull(titles.championFighterId))),
    divisionIds.length === 0
      ? []
      : db.select({ id: divisions.id, slots: divisions.rankingSlots }).from(divisions).where(and(inArray(divisions.id, divisionIds), eq(divisions.active, true))),
  ]);

  const championOf = new Map(titleRows.map((title) => [`${title.level}:${title.divisionId}`, title.championId]));
  const slotsOf = new Map(divisionRows.map((division) => [division.id, division.slots]));
  const versionById = new Map(versions.map((version) => [version.id, version]));
  for (const entry of entryRows) {
    const version = versionById.get(entry.versionId);
    if (!version) continue;
    const slots = version.divisionId ? slotsOf.get(version.divisionId) : P4P_SLOTS;
    if (slots === undefined) continue;
    if (version.divisionId && championOf.get(`${version.level}:${version.divisionId}`) === entry.fighterId) continue;
    const list = shown.get(version.id) ?? [];
    if (list.length < slots) shown.set(version.id, [...list, entry.fighterId]);
  }
  return shown;
}
