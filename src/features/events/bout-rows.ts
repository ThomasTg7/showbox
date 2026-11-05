import { asc, eq, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db";
import { publicScope } from "@/db/public-scope";
import { divisions } from "@/db/schema/divisions";
import { bouts } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { formatMethod, formatResultLine } from "@/domain/bout-result";
import type { ManualRecord } from "@/features/fighters/dto";
import type { MediaDTO } from "@/features/media/dto";
import type { BoutDTO, BoutFighterDTO, BoutResultDTO } from "./dto";

// Lectura de peleas con sus dos boxeadores, división y técnica en UNA consulta (nunca una por pelea).

export const redFighter = alias(fighters, "red_fighter");
export const blueFighter = alias(fighters, "blue_fighter");

function fighterSelection(table: typeof redFighter | typeof blueFighter) {
  return {
    id: table.id,
    slug: table.slug,
    firstName: table.firstName,
    lastName: table.lastName,
    nickname: table.nickname,
    nationality: table.nationality,
    // Público *ahora*: publicado, o programado cuya hora ya llegó; nunca uno en la papelera.
    isPublic: sql<boolean>`coalesce(${publicScope(table)}, false)`,
    proWins: table.proWins,
    proLosses: table.proLosses,
    proDraws: table.proDraws,
    proNoContests: table.proNoContests,
    amWins: table.amWins,
    amLosses: table.amLosses,
    amDraws: table.amDraws,
    amNoContests: table.amNoContests,
    heightCm: table.heightCm,
    weightKg: table.weightKg,
    reachCm: table.reachCm,
    headshotMediaId: table.headshotMediaId,
    bodyMediaId: table.bodyMediaId,
  };
}

/** Peleas que cumplen `where`, en orden de cartelera (`sort_order` de cada bloque). */
export function selectBoutRows(db: Db, where: SQL | undefined) {
  return db
    .select({
      id: bouts.id,
      eventId: bouts.eventId,
      segmentId: bouts.segmentId,
      sortOrder: bouts.sortOrder,
      level: bouts.level,
      scheduledRounds: bouts.scheduledRounds,
      roundSeconds: bouts.roundSeconds,
      isTitleFight: bouts.isTitleFight,
      boutStatus: bouts.boutStatus,
      cancelReason: bouts.cancelReason,
      catchweightKg: bouts.catchweightKg,
      divisionName: divisions.name,
      divisionSlug: divisions.slug,
      divisionGender: divisions.gender,
      outcome: bouts.outcome,
      method: bouts.method,
      koTkoType: bouts.koTkoType,
      decisionType: bouts.decisionType,
      dqReason: bouts.dqReason,
      ncReason: bouts.ncReason,
      ncNote: bouts.ncNote,
      endRound: bouts.endRound,
      endTimeSeconds: bouts.endTimeSeconds,
      referee: bouts.referee,
      scorecards: bouts.scorecards,
      bonuses: bouts.bonuses,
      videoUrl: bouts.videoUrl,
      red: fighterSelection(redFighter),
      blue: fighterSelection(blueFighter),
    })
    .from(bouts)
    .innerJoin(redFighter, eq(redFighter.id, bouts.redFighterId))
    .innerJoin(blueFighter, eq(blueFighter.id, bouts.blueFighterId))
    .leftJoin(divisions, eq(divisions.id, bouts.divisionId))
    .where(where)
    .orderBy(asc(bouts.sortOrder), asc(bouts.id));
}

export type BoutRow = Awaited<ReturnType<typeof selectBoutRows>>[number];
type FighterRow = BoutRow["red"];

/** Ids de imagen que necesita una pelea: el rostro de cada boxeador y, con `withBody`, el cuerpo entero (careo y tarjeta de la cartelera). */
export function boutMediaIds(row: BoutRow, withBody: boolean): (string | null)[] {
  const ids = [row.red.headshotMediaId, row.blue.headshotMediaId];
  return withBody ? [...ids, row.red.bodyMediaId, row.blue.bodyMediaId] : ids;
}

function manualRecord(fighter: FighterRow, level: BoutRow["level"]): ManualRecord {
  return level === "pro"
    ? { wins: fighter.proWins, losses: fighter.proLosses, draws: fighter.proDraws, noContests: fighter.proNoContests }
    : { wins: fighter.amWins, losses: fighter.amLosses, draws: fighter.amDraws, noContests: fighter.amNoContests };
}

function toFighterDTO(fighter: FighterRow, level: BoutRow["level"], mediaById: Map<string, MediaDTO>, withBody: boolean): BoutFighterDTO {
  return {
    id: fighter.id,
    slug: fighter.slug,
    firstName: fighter.firstName,
    lastName: fighter.lastName,
    nickname: fighter.nickname,
    nationality: fighter.nationality,
    isPublic: fighter.isPublic,
    record: manualRecord(fighter, level),
    heightCm: fighter.heightCm,
    weightKg: fighter.weightKg,
    reachCm: fighter.reachCm,
    headshotMedia: fighter.headshotMediaId ? (mediaById.get(fighter.headshotMediaId) ?? null) : null,
    bodyMedia: withBody && fighter.bodyMediaId ? (mediaById.get(fighter.bodyMediaId) ?? null) : null,
  };
}

function toResultDTO(row: BoutRow): BoutResultDTO | null {
  if (row.boutStatus !== "completed" || !row.outcome || !row.method || row.endRound === null || row.endTimeSeconds === null) return null;
  const detail = { method: row.method, koTkoType: row.koTkoType, decisionType: row.decisionType, dqReason: row.dqReason };
  return {
    outcome: row.outcome,
    method: row.method,
    endRound: row.endRound,
    endTimeSeconds: row.endTimeSeconds,
    line: formatResultLine({
      ...detail,
      outcome: row.outcome,
      ncReason: row.ncReason,
      ncNote: row.ncNote,
      endRound: row.endRound,
      endTimeSeconds: row.endTimeSeconds,
      redName: row.red.lastName,
      blueName: row.blue.lastName,
    }),
    methodText: formatMethod(detail),
    referee: row.referee,
    scorecards: row.scorecards,
    bonuses: row.bonuses,
    videoUrl: row.videoUrl,
  };
}

export function toBoutDTO(row: BoutRow, mediaById: Map<string, MediaDTO>, withBody: boolean): BoutDTO {
  return {
    id: row.id,
    level: row.level,
    scheduledRounds: row.scheduledRounds,
    roundSeconds: row.roundSeconds,
    isTitleFight: row.isTitleFight,
    status: row.boutStatus,
    cancelReason: row.cancelReason,
    division: row.divisionName && row.divisionSlug && row.divisionGender ? { name: row.divisionName, slug: row.divisionSlug, gender: row.divisionGender } : null,
    catchweightKg: row.catchweightKg,
    red: toFighterDTO(row.red, row.level, mediaById, withBody),
    blue: toFighterDTO(row.blue, row.level, mediaById, withBody),
    result: toResultDTO(row),
  };
}
