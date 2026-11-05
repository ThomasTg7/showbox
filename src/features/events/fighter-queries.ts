import { and, asc, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db";
import { publicScope } from "@/db/public-scope";
import { divisions } from "@/db/schema/divisions";
import { bouts, events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { formatMethod, roundAndTime } from "@/domain/bout-result";
import { resultFor, type BoutOutcomeForRecord } from "@/domain/record";
import { fighterPhotoIds, fighterPhotos, loadMedia } from "@/features/fighters/query-helpers";
import type { MediaDTO } from "@/features/media/dto";
import type { FightHistoryRow, NextBoutDTO, OpponentDTO } from "./dto";
import { eventsWithPendingBouts } from "./event-scope";

// Lado del boxeador: qué peleas cuentan para su récord, su historial y su próxima pelea.
// Solo cuentan las peleas de eventos públicos *ahora*: un evento en borrador, en la papelera o programado a
// futuro no altera el récord ni el historial (y por eso todas pasan por `publicScope(events)`).

// Tope de seguridad del historial: un boxeador con más de esto en la promotora es un dato roto, no un caso de uso.
const HISTORY_LIMIT = 100;

const opponent = alias(fighters, "opponent");

const isFighterInBout = (fighterId: string) => or(eq(bouts.redFighterId, fighterId), eq(bouts.blueFighterId, fighterId));

/** Une la pelea con el rival del boxeador (la esquina contraria) sin dos consultas. */
const opponentOf = (fighterId: string) =>
  eq(opponent.id, sql`case when ${bouts.redFighterId} = ${fighterId} then ${bouts.blueFighterId} else ${bouts.redFighterId} end`);

const opponentColumns = {
  id: opponent.id,
  slug: opponent.slug,
  firstName: opponent.firstName,
  lastName: opponent.lastName,
  nationality: opponent.nationality,
  isPublic: sql<boolean>`coalesce(${publicScope(opponent)}, false)`,
  headshotMediaId: opponent.headshotMediaId,
  bodyMediaId: opponent.bodyMediaId,
};

type OpponentRow = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nationality: string;
  isPublic: boolean;
  headshotMediaId: string | null;
  bodyMediaId: string | null;
};

function toOpponent({ headshotMediaId, bodyMediaId, ...rest }: OpponentRow, mediaById: Map<string, MediaDTO>): OpponentDTO {
  return { ...rest, ...fighterPhotos(mediaById, { headshotMediaId, bodyMediaId }) };
}

async function loadOpponentMedia(db: Db, rows: { opponent: OpponentRow }[]): Promise<Map<string, MediaDTO>> {
  return loadMedia(db, fighterPhotoIds(rows.map((row) => row.opponent)));
}

/** Peleas con resultado de eventos públicos, listas para `computeRecord`. */
export async function listBoutsForRecord(db: Db, fighterId: string): Promise<BoutOutcomeForRecord[]> {
  const rows = await db
    .select({
      boutId: bouts.id,
      date: events.startsAt,
      level: bouts.level,
      redFighterId: bouts.redFighterId,
      blueFighterId: bouts.blueFighterId,
      outcome: bouts.outcome,
      method: bouts.method,
      endRound: bouts.endRound,
      endTimeSeconds: bouts.endTimeSeconds,
      roundSeconds: bouts.roundSeconds,
    })
    .from(bouts)
    .innerJoin(events, eq(events.id, bouts.eventId))
    .where(
      and(
        publicScope(events),
        eq(bouts.boutStatus, "completed"),
        isFighterInBout(fighterId),
        isNotNull(bouts.outcome),
        isNotNull(bouts.method),
        isNotNull(bouts.endRound),
        isNotNull(bouts.endTimeSeconds),
      ),
    );

  return rows.flatMap((row) =>
    row.outcome && row.method && row.endRound !== null && row.endTimeSeconds !== null
      ? [{ ...row, outcome: row.outcome, method: row.method, endRound: row.endRound, endTimeSeconds: row.endTimeSeconds }]
      : [],
  );
}

/** Peleas terminadas del boxeador, la más reciente primero. La fecha va como texto ISO (se cachea en JSON). */
export async function getFighterFightHistory(db: Db, fighterId: string): Promise<FightHistoryRow[]> {
  const rows = await db
    .select({
      boutId: bouts.id,
      level: bouts.level,
      outcome: bouts.outcome,
      method: bouts.method,
      koTkoType: bouts.koTkoType,
      decisionType: bouts.decisionType,
      dqReason: bouts.dqReason,
      redFighterId: bouts.redFighterId,
      endRound: bouts.endRound,
      endTimeSeconds: bouts.endTimeSeconds,
      eventId: events.id,
      eventSlug: events.slug,
      eventName: events.name,
      date: events.startsAt,
      opponent: opponentColumns,
    })
    .from(bouts)
    .innerJoin(events, eq(events.id, bouts.eventId))
    .innerJoin(opponent, opponentOf(fighterId))
    .where(
      and(
        publicScope(events),
        eq(bouts.boutStatus, "completed"),
        isFighterInBout(fighterId),
        isNotNull(bouts.outcome),
        isNotNull(bouts.method),
        isNotNull(bouts.endRound),
        isNotNull(bouts.endTimeSeconds),
      ),
    )
    .orderBy(desc(events.startsAt), desc(bouts.sortOrder), asc(bouts.id))
    .limit(HISTORY_LIMIT);

  const mediaById = await loadOpponentMedia(db, rows);
  return rows.flatMap((row) => {
    if (!row.outcome || !row.method || row.endRound === null || row.endTimeSeconds === null) return [];
    return [
      {
        boutId: row.boutId,
        level: row.level,
        fighterResult: resultFor({ outcome: row.outcome, redFighterId: row.redFighterId }, fighterId),
        methodText: formatMethod({ method: row.method, koTkoType: row.koTkoType, decisionType: row.decisionType, dqReason: row.dqReason }),
        roundTime: roundAndTime({ method: row.method, endRound: row.endRound, endTimeSeconds: row.endTimeSeconds }),
        date: row.date.toISOString(),
        eventId: row.eventId,
        eventSlug: row.eventSlug,
        eventName: row.eventName,
        opponent: toOpponent(row.opponent, mediaById),
      },
    ];
  });
}

/** La próxima pelea programada del boxeador en un evento público que aún no termina ni se canceló. */
export async function getFighterNextBout(db: Db, fighterId: string): Promise<NextBoutDTO | null> {
  const [row] = await db
    .select({
      boutId: bouts.id,
      isTitleFight: bouts.isTitleFight,
      scheduledRounds: bouts.scheduledRounds,
      roundSeconds: bouts.roundSeconds,
      catchweightKg: bouts.catchweightKg,
      divisionName: divisions.name,
      divisionGender: divisions.gender,
      eventId: events.id,
      eventSlug: events.slug,
      eventName: events.name,
      eventStartsAt: events.startsAt,
      eventCity: events.venueCity,
      opponent: opponentColumns,
    })
    .from(bouts)
    .innerJoin(events, eq(events.id, bouts.eventId))
    .innerJoin(opponent, opponentOf(fighterId))
    .leftJoin(divisions, eq(divisions.id, bouts.divisionId))
    .where(and(publicScope(events), eventsWithPendingBouts(), eq(bouts.boutStatus, "scheduled"), isFighterInBout(fighterId)))
    .orderBy(asc(events.startsAt), asc(bouts.id))
    .limit(1);
  if (!row) return null;

  const mediaById = await loadOpponentMedia(db, [row]);
  return {
    boutId: row.boutId,
    isTitleFight: row.isTitleFight,
    scheduledRounds: row.scheduledRounds,
    roundSeconds: row.roundSeconds,
    divisionName: row.catchweightKg === null ? row.divisionName : null,
    divisionGender: row.catchweightKg === null ? row.divisionGender : null,
    catchweightKg: row.catchweightKg,
    event: { id: row.eventId, slug: row.eventSlug, name: row.eventName, startsAt: row.eventStartsAt.toISOString(), venueCity: row.eventCity },
    opponent: toOpponent(row.opponent, mediaById),
  };
}
