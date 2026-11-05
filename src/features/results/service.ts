import { and, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db";
import { bouts, events, type Bout, type OverturnedResult } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import type { Executor } from "@/db/types";
import { toScheduledRounds, type BoutLevel } from "@/domain/bout-enums";
import { formatResultLine, validateBoutResult, type BoutResultInput, type NormalizedResult } from "@/domain/bout-result";
import { logAudit } from "@/features/audit/log";
import { UserFacingError } from "@/lib/user-facing-error";
import { BOUT_NOT_FOUND, EVENT_NOT_FOUND, lockEventOfBout } from "@/features/events/event-lock";
import { completeEventIfDone } from "./completion";
import { getNextPendingBoutId } from "./night-order";

const NO_RESULT = "Esta pelea no tiene resultado";

/** El retador (la esquina contraria a la del campeón) que gana una pelea por el título: el Plan 05 lo confirma y actualiza el campeón. */
export type TitleChangeCandidate = { divisionId: string; level: BoutLevel; newChampionId: string };

export type RecordResultOutcome =
  | { ok: true; titleChange: TitleChangeCandidate | null; nextBoutId: string | null }
  | { ok: false; errors: Record<string, string> };

/** Columnas del resultado: lo que se escribe al registrarlo y lo que se compara para auditar una corrección. */
const RESULT_FIELDS = [
  "outcome",
  "method",
  "koTkoType",
  "decisionType",
  "dqReason",
  "ncReason",
  "ncNote",
  "endRound",
  "endTimeSeconds",
  "referee",
  "scorecards",
  "bonuses",
  "videoUrl",
  "notes",
] as const;

type ResultSnapshot = Pick<Bout, (typeof RESULT_FIELDS)[number]>;

const NO_RESULT_COLUMNS = {
  boutStatus: "scheduled" as const,
  outcome: null,
  method: null,
  koTkoType: null,
  decisionType: null,
  dqReason: null,
  ncReason: null,
  ncNote: null,
  endRound: null,
  endTimeSeconds: null,
  referee: null,
  scorecards: null,
  bonuses: [],
  videoUrl: null,
  notes: null,
  overturnedFrom: null,
};

type LoadedBout = { bout: Bout; label: string; eventName: string };

/** La pelea y sus nombres para los mensajes; no se toca la de un evento en la papelera. */
async function loadBout(db: Executor, boutId: string): Promise<LoadedBout> {
  const red = alias(fighters, "red_fighter");
  const blue = alias(fighters, "blue_fighter");
  const [row] = await db
    .select({ bout: bouts, redName: red.lastName, blueName: blue.lastName, eventName: events.name, eventDeletedAt: events.deletedAt })
    .from(bouts)
    .innerJoin(events, eq(events.id, bouts.eventId))
    .innerJoin(red, eq(red.id, bouts.redFighterId))
    .innerJoin(blue, eq(blue.id, bouts.blueFighterId))
    .where(eq(bouts.id, boutId))
    .limit(1);
  if (!row) throw new UserFacingError(BOUT_NOT_FOUND);
  if (row.eventDeletedAt) throw new UserFacingError(EVENT_NOT_FOUND);
  return { bout: row.bout, label: `${row.redName} vs ${row.blueName}`, eventName: row.eventName };
}

const hasResult = (bout: Bout) => bout.boutStatus === "completed" || bout.outcome !== null;

function snapshot(bout: ResultSnapshot): ResultSnapshot {
  return Object.fromEntries(RESULT_FIELDS.map((field) => [field, bout[field]])) as ResultSnapshot;
}

/** Solo los campos que cambiaron, antes y después: es lo que muestra la auditoría de una corrección. */
function changedFields(before: ResultSnapshot, after: ResultSnapshot): { antes: Partial<ResultSnapshot>; despues: Partial<ResultSnapshot> } {
  const antes: Record<string, unknown> = {};
  const despues: Record<string, unknown> = {};
  for (const field of RESULT_FIELDS) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      antes[field] = before[field];
      despues[field] = after[field];
    }
  }
  return { antes: antes as Partial<ResultSnapshot>, despues: despues as Partial<ResultSnapshot> };
}

/**
 * Guarda (o corrige) el resultado de una pelea. Un resultado que no pasa la validación no se guarda y devuelve un
 * error por campo. Deja la pelea `completed`; si era la última pendiente, el evento pasa a `completed`. Devuelve la
 * siguiente pelea de la noche y, si el retador ganó una pelea por el título, el posible cambio de campeón.
 */
export async function recordBoutResult(db: Db, boutId: string, input: BoutResultInput, actorId: string): Promise<RecordResultOutcome> {
  return db.transaction(async (tx): Promise<RecordResultOutcome> => {
    await lockEventOfBout(tx, boutId);
    const { bout, label, eventName } = await loadBout(tx, boutId);
    if (bout.boutStatus === "cancelled") throw new UserFacingError("Esta pelea está cancelada: repónla antes de registrar el resultado");

    const validated = validateBoutResult(input, { scheduledRounds: toScheduledRounds(bout.scheduledRounds), roundSeconds: bout.roundSeconds });
    if (!validated.ok) return validated;
    const value: NormalizedResult = validated.value;
    // «Resultado anulado» lo pone solo «Anular resultado», que guarda el original. Volver a guardar uno ya anulado (p. ej.
    // para agregar el video) lo conserva; cualquier otro resultado reemplaza la anulación.
    const staysOverturned = value.ncReason === "overturned";
    if (staysOverturned && bout.ncReason !== "overturned") return { ok: false, errors: { ncReason: "Para anular un resultado usa «Anular resultado»" } };

    const [redName, blueName] = label.split(" vs ") as [string, string];
    const line = formatResultLine({ ...value, redName, blueName });

    const columns = { ...value, boutStatus: "completed" as const, overturnedFrom: staysOverturned ? bout.overturnedFrom : null };
    await tx.update(bouts).set(columns).where(eq(bouts.id, boutId));

    const correcting = hasResult(bout);
    await logAudit(tx, {
      actorId,
      action: correcting ? "update" : "result",
      entityType: "bout",
      entityId: boutId,
      summary: `${correcting ? "Corrigió" : "Registró"} el resultado en ${eventName}: ${line}`,
      diff: correcting ? changedFields(snapshot(bout), snapshot({ ...bout, ...columns })) : undefined,
    });

    const nextBoutId = await getNextPendingBoutId(tx, bout.eventId);
    if (nextBoutId === null) await completeEventIfDone(tx, bout.eventId, actorId);

    // El retador es la esquina contraria a la del campeón: si él gana una pelea por el título con división, es el candidato.
    const challengerWins = value.outcome === (bout.championCorner === "red" ? "blue_win" : "red_win");
    const titleChange: TitleChangeCandidate | null =
      bout.isTitleFight && challengerWins && bout.divisionId
        ? { divisionId: bout.divisionId, level: bout.level, newChampionId: bout.championCorner === "red" ? bout.blueFighterId : bout.redFighterId }
        : null;
    return { ok: true, titleChange, nextBoutId };
  });
}

/** Borra el resultado: la pelea vuelve a programada y deja de contar en los récords. */
export async function clearBoutResult(db: Db, boutId: string, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockEventOfBout(tx, boutId);
    const { bout, label, eventName } = await loadBout(tx, boutId);
    if (!hasResult(bout)) throw new UserFacingError(NO_RESULT);

    await tx.update(bouts).set(NO_RESULT_COLUMNS).where(eq(bouts.id, boutId));
    await logAudit(tx, {
      actorId,
      action: "update",
      entityType: "bout",
      entityId: boutId,
      summary: `Borró el resultado de ${label} en ${eventName}`,
      diff: { antes: snapshot(bout) },
    });
  });
}

/**
 * Anula un resultado (por ejemplo, por dopaje): la pelea queda «sin resultado» por anulación y se conserva el
 * resultado original con la nota. Un resultado nuevo, si lo hay, reemplaza a la anulación.
 */
export async function overturnResult(db: Db, boutId: string, note: string, actorId: string): Promise<void> {
  const trimmedNote = note.trim();
  if (!trimmedNote) throw new UserFacingError("Explica por qué se anula el resultado");
  if (trimmedNote.length > 200) throw new UserFacingError("La nota es demasiado larga (máx. 200 caracteres)");

  await db.transaction(async (tx) => {
    await lockEventOfBout(tx, boutId);
    const { bout, label, eventName } = await loadBout(tx, boutId);
    if (!hasResult(bout) || bout.outcome === null || bout.method === null) throw new UserFacingError(NO_RESULT);
    if (bout.ncReason === "overturned") throw new UserFacingError("Este resultado ya fue anulado");

    const original: OverturnedResult = {
      outcome: bout.outcome,
      method: bout.method,
      koTkoType: bout.koTkoType,
      decisionType: bout.decisionType,
      dqReason: bout.dqReason,
      ncReason: bout.ncReason,
      ncNote: bout.ncNote,
      endRound: bout.endRound ?? 0,
      endTimeSeconds: bout.endTimeSeconds ?? 0,
      scorecards: bout.scorecards,
      bonuses: bout.bonuses,
      note: trimmedNote,
    };

    await tx
      .update(bouts)
      .set({
        outcome: "no_contest",
        method: "no_contest",
        ncReason: "overturned",
        ncNote: trimmedNote,
        koTkoType: null,
        decisionType: null,
        dqReason: null,
        scorecards: null,
        bonuses: [],
        overturnedFrom: original,
      })
      .where(eq(bouts.id, boutId));
    await logAudit(tx, { actorId, action: "update", entityType: "bout", entityId: boutId, summary: `Anuló el resultado de ${label} en ${eventName}: ${trimmedNote}`, diff: { antes: snapshot(bout) } });
  });
}

/** Abre la noche de pelea: un evento programado pasa a «en vivo». Uno finalizado se deja como está (se puede corregir). */
export async function startLiveEvent(db: Db, eventId: string, actorId: string): Promise<void> {
  const [event] = await db
    .select({ name: events.name, eventStatus: events.eventStatus })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!event) throw new UserFacingError(EVENT_NOT_FOUND);
  if (event.eventStatus === "cancelled") throw new UserFacingError("El evento está cancelado");
  if (event.eventStatus !== "scheduled") return;

  await db.transaction(async (tx) => {
    await tx.update(events).set({ eventStatus: "live" }).where(and(eq(events.id, eventId), eq(events.eventStatus, "scheduled")));
    await logAudit(tx, { actorId, action: "update", entityType: "event", entityId: eventId, summary: `Abrió la noche de pelea de ${event.name}: el evento está en vivo` });
  });
}
