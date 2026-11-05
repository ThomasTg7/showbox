import { and, asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { bouts, cardSegments, events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import type { BoutCorner, BoutLevel, BoutStatus, EventStatus } from "@/domain/bout-enums";
import { formatResultLine } from "@/domain/bout-result";
import type { MediaDTO } from "@/features/media/dto";
import { getMediaByIds } from "@/features/media/queries";
import type { SavedResult } from "@/features/results/result-draft";
import { toLocalInputs } from "@/lib/local-time";

// La cartelera tal como la ve el panel: todas las peleas (también canceladas y con resultado) con lo necesario para
// editarlas, moverlas y registrar su resultado. Tres consultas y una lectura de medios, sin importar cuántas peleas.

export type AdminBoutFighter = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  nationality: string;
  headshotMedia: MediaDTO | null;
  /** Si no hay foto de rostro, el panel muestra la de cuerpo recortada desde arriba. */
  bodyMedia: MediaDTO | null;
};

export type AdminBout = {
  id: string;
  segmentId: string;
  level: BoutLevel;
  scheduledRounds: number;
  roundSeconds: number;
  isTitleFight: boolean;
  /** La esquina del campeón en una pelea por el título. */
  championCorner: BoutCorner;
  status: BoutStatus;
  cancelReason: string | null;
  divisionId: string | null;
  divisionName: string | null;
  divisionGender: "male" | "female" | null;
  catchweightKg: number | null;
  red: AdminBoutFighter;
  blue: AdminBoutFighter;
  /** El resultado guardado (para corregirlo) y su línea legible; `null` si aún no hay. */
  result: SavedResult | null;
  resultLine: string | null;
};

export type AdminSegment = { id: string; name: string; startsTime: string; bouts: AdminBout[] };

export type AdminCard = {
  event: { id: string; name: string; slug: string; eventStatus: EventStatus; startsAt: string };
  segments: AdminSegment[];
};

/** La cartelera del evento (fuera de la papelera) en orden de cartelera: bloques y peleas por `sort_order`. */
export async function getAdminCard(db: Db, eventId: string): Promise<AdminCard | null> {
  const [event] = await db
    .select({ id: events.id, name: events.name, slug: events.slug, eventStatus: events.eventStatus, startsAt: events.startsAt })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!event) return null;

  const red = alias(fighters, "red_fighter");
  const blue = alias(fighters, "blue_fighter");
  const fighterColumns = (table: typeof red | typeof blue) => ({
    id: table.id,
    firstName: table.firstName,
    lastName: table.lastName,
    nickname: table.nickname,
    nationality: table.nationality,
    headshotMediaId: table.headshotMediaId,
    bodyMediaId: table.bodyMediaId,
  });

  const [segmentRows, boutRows] = await Promise.all([
    db.select().from(cardSegments).where(eq(cardSegments.eventId, eventId)).orderBy(asc(cardSegments.sortOrder), asc(cardSegments.id)),
    db
      .select({
        bout: bouts,
        red: fighterColumns(red),
        blue: fighterColumns(blue),
        divisionName: divisions.name,
        divisionGender: divisions.gender,
      })
      .from(bouts)
      .innerJoin(red, eq(red.id, bouts.redFighterId))
      .innerJoin(blue, eq(blue.id, bouts.blueFighterId))
      .leftJoin(divisions, eq(divisions.id, bouts.divisionId))
      .where(eq(bouts.eventId, eventId))
      .orderBy(asc(bouts.sortOrder), asc(bouts.id)),
  ]);

  const photoIds = boutRows
    .flatMap((row) => [row.red.headshotMediaId, row.red.bodyMediaId, row.blue.headshotMediaId, row.blue.bodyMediaId])
    .filter((id): id is string => id !== null);
  const mediaById = await getMediaByIds(db, [...new Set(photoIds)]);
  const toFighter = ({ headshotMediaId, bodyMediaId, ...fighter }: (typeof boutRows)[number]["red"]): AdminBoutFighter => ({
    ...fighter,
    headshotMedia: headshotMediaId ? (mediaById.get(headshotMediaId) ?? null) : null,
    bodyMedia: bodyMediaId ? (mediaById.get(bodyMediaId) ?? null) : null,
  });

  const boutsBySegment = new Map<string, AdminBout[]>();
  for (const row of boutRows) {
    const { bout } = row;
    const hasResult = bout.boutStatus === "completed" && bout.outcome !== null && bout.method !== null && bout.endRound !== null && bout.endTimeSeconds !== null;
    const adminBout: AdminBout = {
      id: bout.id,
      segmentId: bout.segmentId,
      level: bout.level,
      scheduledRounds: bout.scheduledRounds,
      roundSeconds: bout.roundSeconds,
      isTitleFight: bout.isTitleFight,
      championCorner: bout.championCorner,
      status: bout.boutStatus,
      cancelReason: bout.cancelReason,
      divisionId: bout.divisionId,
      divisionName: row.divisionName,
      divisionGender: row.divisionGender,
      catchweightKg: bout.catchweightKg,
      red: toFighter(row.red),
      blue: toFighter(row.blue),
      result: hasResult
        ? {
            outcome: bout.outcome,
            method: bout.method,
            koTkoType: bout.koTkoType,
            decisionType: bout.decisionType,
            dqReason: bout.dqReason,
            ncReason: bout.ncReason,
            ncNote: bout.ncNote,
            endRound: bout.endRound,
            endTimeSeconds: bout.endTimeSeconds,
            referee: bout.referee,
            scorecards: bout.scorecards,
            bonuses: bout.bonuses,
            videoUrl: bout.videoUrl,
            notes: bout.notes,
          }
        : null,
      resultLine: null,
    };
    if (adminBout.result && bout.outcome && bout.method && bout.endRound !== null && bout.endTimeSeconds !== null) {
      adminBout.resultLine = formatResultLine({
        outcome: bout.outcome,
        method: bout.method,
        koTkoType: bout.koTkoType,
        decisionType: bout.decisionType,
        dqReason: bout.dqReason,
        ncReason: bout.ncReason,
        ncNote: bout.ncNote,
        endRound: bout.endRound,
        endTimeSeconds: bout.endTimeSeconds,
        redName: row.red.lastName,
        blueName: row.blue.lastName,
      });
    }
    boutsBySegment.set(bout.segmentId, [...(boutsBySegment.get(bout.segmentId) ?? []), adminBout]);
  }

  return {
    event: { id: event.id, name: event.name, slug: event.slug, eventStatus: event.eventStatus, startsAt: event.startsAt.toISOString() },
    segments: segmentRows.map((segment) => ({
      id: segment.id,
      name: segment.name,
      startsTime: segment.startsAt ? toLocalInputs(segment.startsAt).time : "",
      bouts: boutsBySegment.get(segment.id) ?? [],
    })),
  };
}
