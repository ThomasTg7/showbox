import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { bouts, events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { dismissedSuggestions, rankingEntries, titles } from "@/db/schema/rankings";
import type { BoutLevel } from "@/domain/bout-enums";
import { rankingScopeKey, suggestAfterEvent, type RankedResult, type RankingSuggestion } from "@/domain/rankings";
import { eligibleFighter } from "./eligibility";
import { listLatestVersions } from "./versions";

export type SuggestionItem = RankingSuggestion & { fighterName: string; fighterNationality: string; eventId: string; eventName: string; scopeKey: string };

type ResultRow = RankedResult & { divisionId: string; eventId: string; eventName: string; winnerFullName: string; winnerNationality: string };

const red = alias(fighters, "red_fighter");
const blue = alias(fighters, "blue_fighter");

/**
 * Sugerencias de ranking por división (clave = id de la división) a partir de los resultados del **último evento** con
 * peleas decididas en esa división y nivel, comparados con el ranking vigente: se acepta o se descarta cada una. Una
 * sugerencia ya aplicada deja de salir sola (el ranking ya la refleja) y una descartada no vuelve para ese evento.
 * `divisionId` limita a una división. Consultas fijas: no hay una por división.
 */
export async function listSuggestions(db: Db, level: BoutLevel, divisionId?: string): Promise<Map<string, SuggestionItem[]>> {
  const suggestions = new Map<string, SuggestionItem[]>();
  const decided = and(
    eq(bouts.level, level),
    eq(bouts.boutStatus, "completed"),
    inArray(bouts.outcome, ["red_win", "blue_win"]),
    isNotNull(bouts.divisionId),
    isNull(events.deletedAt),
    divisionId ? eq(bouts.divisionId, divisionId) : undefined,
  );

  const latestEvents = await db
    .selectDistinctOn([bouts.divisionId], { divisionId: bouts.divisionId, eventId: bouts.eventId })
    .from(bouts)
    .innerJoin(events, eq(events.id, bouts.eventId))
    .where(decided)
    .orderBy(asc(bouts.divisionId), desc(events.startsAt), desc(events.id));
  if (latestEvents.length === 0) return suggestions;
  const latestEventOf = new Map(latestEvents.flatMap((row) => (row.divisionId ? [[row.divisionId, row.eventId] as const] : [])));

  const resultRows = await db
    .select({
      divisionId: bouts.divisionId,
      eventId: events.id,
      eventName: events.name,
      outcome: bouts.outcome,
      redId: red.id,
      redFirstName: red.firstName,
      redLastName: red.lastName,
      redNationality: red.nationality,
      blueId: blue.id,
      blueFirstName: blue.firstName,
      blueLastName: blue.lastName,
      blueNationality: blue.nationality,
    })
    .from(bouts)
    .innerJoin(events, eq(events.id, bouts.eventId))
    .innerJoin(red, eq(red.id, bouts.redFighterId))
    .innerJoin(blue, eq(blue.id, bouts.blueFighterId))
    .where(and(decided, inArray(bouts.eventId, [...new Set(latestEventOf.values())])));

  const results: ResultRow[] = rowsOfLatestEvents(resultRows, latestEventOf);
  if (results.length === 0) return suggestions;

  const divisionIds = [...new Set(results.map((result) => result.divisionId))];
  const winnerIds = [...new Set(results.map((result) => result.winnerId))];
  const latestVersions = await listLatestVersions(db, { level }, 1);
  const versionIds = latestVersions.flatMap((version) => (version.divisionId && divisionIds.includes(version.divisionId) ? [version.id] : []));
  const [divisionRows, titleRows, entryRows, dismissedRows, eligibleRows] = await Promise.all([
    db.select({ id: divisions.id, slots: divisions.rankingSlots }).from(divisions).where(inArray(divisions.id, divisionIds)),
    db.select({ divisionId: titles.divisionId, championId: titles.championFighterId }).from(titles).where(and(eq(titles.level, level), inArray(titles.divisionId, divisionIds))),
    versionIds.length === 0
      ? []
      : db.select({ versionId: rankingEntries.versionId, fighterId: rankingEntries.fighterId }).from(rankingEntries).where(inArray(rankingEntries.versionId, versionIds)).orderBy(asc(rankingEntries.versionId), asc(rankingEntries.position)),
    db.select({ eventId: dismissedSuggestions.eventId, fighterId: dismissedSuggestions.fighterId, scopeKey: dismissedSuggestions.scopeKey }).from(dismissedSuggestions).where(inArray(dismissedSuggestions.eventId, [...new Set(results.map((result) => result.eventId))])),
    db.select({ id: fighters.id }).from(fighters).where(and(inArray(fighters.id, winnerIds), eligibleFighter(level, null))),
  ]);

  const slotsOf = new Map(divisionRows.map((row) => [row.id, row.slots]));
  const championOf = new Map(titleRows.map((row) => [row.divisionId, row.championId]));
  const versionOf = new Map(latestVersions.map((version) => [version.divisionId, version.id]));
  const rankingOfVersion = new Map<string, string[]>();
  for (const entry of entryRows) rankingOfVersion.set(entry.versionId, [...(rankingOfVersion.get(entry.versionId) ?? []), entry.fighterId]);
  const dismissed = new Set(dismissedRows.map((row) => `${row.eventId}|${row.fighterId}|${row.scopeKey}`));
  const eligibleWinners = new Set(eligibleRows.map((row) => row.id));

  for (const id of divisionIds) {
    const inDivision = results.filter((result) => result.divisionId === id && eligibleWinners.has(result.winnerId));
    const versionId = versionOf.get(id);
    const scopeKey = rankingScopeKey({ level, divisionId: id });
    const items = suggestAfterEvent({
      ranking: versionId ? (rankingOfVersion.get(versionId) ?? []) : [],
      championId: championOf.get(id) ?? null,
      slots: slotsOf.get(id) ?? 0,
      results: inDivision,
    }).flatMap((suggestion) => {
      const source = inDivision.find((result) => result.winnerId === suggestion.fighterId);
      if (!source || dismissed.has(`${source.eventId}|${suggestion.fighterId}|${scopeKey}`)) return [];
      return [{ ...suggestion, fighterName: source.winnerFullName, fighterNationality: source.winnerNationality, eventId: source.eventId, eventName: source.eventName, scopeKey }];
    });
    if (items.length > 0) suggestions.set(id, items);
  }
  return suggestions;
}

type RawResult = {
  divisionId: string | null;
  eventId: string;
  eventName: string;
  outcome: string | null;
  redId: string;
  redFirstName: string;
  redLastName: string;
  blueId: string;
  blueFirstName: string;
  blueLastName: string;
  redNationality: string;
  blueNationality: string;
};

/** Ganador y perdedor de cada pelea, solo de las peleas del último evento de su división. */
function rowsOfLatestEvents(rows: RawResult[], latestEventOf: Map<string, string>): ResultRow[] {
  return rows.flatMap((row) => {
    if (!row.divisionId || latestEventOf.get(row.divisionId) !== row.eventId) return [];
    const redWins = row.outcome === "red_win";
    return [
      {
        divisionId: row.divisionId,
        eventId: row.eventId,
        eventName: row.eventName,
        winnerId: redWins ? row.redId : row.blueId,
        loserId: redWins ? row.blueId : row.redId,
        winnerName: redWins ? row.redLastName : row.blueLastName,
        loserName: redWins ? row.blueLastName : row.redLastName,
        winnerNationality: redWins ? row.redNationality : row.blueNationality,
        winnerFullName: redWins ? `${row.redFirstName} ${row.redLastName}` : `${row.blueFirstName} ${row.blueLastName}`,
      },
    ];
  });
}
