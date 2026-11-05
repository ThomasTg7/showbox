// Valores de las enumeraciones de peleas: los usa el esquema de la base, la validación y la interfaz.

export const EVENT_STATUSES = ["scheduled", "live", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const BOUT_LEVELS = ["pro", "amateur"] as const;
export type BoutLevel = (typeof BOUT_LEVELS)[number];

/** Esquinas de una pelea: la roja se anuncia primero; en una pelea por el título el campeón puede estar en cualquiera. */
export const BOUT_CORNERS = ["red", "blue"] as const;
export type BoutCorner = (typeof BOUT_CORNERS)[number];
export const BOUT_CORNER_LABELS: Record<BoutCorner, string> = { red: "Esquina roja", blue: "Esquina azul" };

export const BOUT_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type BoutStatus = (typeof BOUT_STATUSES)[number];

export const OUTCOMES = ["red_win", "blue_win", "draw", "no_contest"] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Cómo termina una pelea de boxeo: antes del límite (KO, TKO, RTD), en las tarjetas, o por descalificación / sin resultado. */
export const METHODS = ["ko_tko", "decision", "technical_decision", "disqualification", "no_contest"] as const;
export type Method = (typeof METHODS)[number];

/** KO (cuenta de diez), TKO por detención del árbitro, del médico o por lesión, y RTD (la esquina no lo saca al siguiente round). */
export const KO_TKO_TYPES = ["ko", "tko_referee", "tko_doctor", "rtd", "tko_injury"] as const;
export type KoTkoType = (typeof KO_TKO_TYPES)[number];

export const DECISION_TYPES = ["unanimous", "split", "majority"] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

export const NC_REASONS = ["accidental_foul", "overturned", "other"] as const;
export type NcReason = (typeof NC_REASONS)[number];

/**
 * Motivos de «sin resultado» que se ofrecen al cargar un resultado. «Resultado anulado» lo pone «Anular resultado» (que
 * guarda el original): solo aparece si la pelea ya lo tiene, para poder volver a guardarla tal cual.
 */
export function selectableNcReasons(current: string): readonly NcReason[] {
  return current === "overturned" ? NC_REASONS : NC_REASONS.filter((reason) => reason !== "overturned");
}

export const BONUSES = ["fight_of_night", "performance_of_night", "ko_of_night"] as const;
export type Bonus = (typeof BONUSES)[number];

/** Rounds pactados: 3 en amateur; 4 a 12 en profesional (12 en peleas por el título). */
export const SCHEDULED_ROUNDS = [3, 4, 5, 6, 8, 10, 12] as const;
export type ScheduledRounds = (typeof SCHEDULED_ROUNDS)[number];

/** Un número guardado en la base como rounds pactados válidos (o los de por defecto si no lo es). */
export function toScheduledRounds(value: number): ScheduledRounds {
  return (SCHEDULED_ROUNDS as readonly number[]).includes(value) ? (value as ScheduledRounds) : DEFAULT_SCHEDULED_ROUNDS;
}

/** Rounds de 3 minutos (2 en muchas peleas femeninas y amateur juveniles: se cambia por pelea). */
export const DEFAULT_ROUND_SECONDS = 180;
export const DEFAULT_SCHEDULED_ROUNDS: ScheduledRounds = 6;
export const MIN_ROUND_SECONDS = 60;
export const MAX_ROUND_SECONDS = 300;

// Textos para la persona (es-EC). Empiezan con mayúscula: dentro de una frase se pasan a minúscula.

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = { scheduled: "Programado", live: "En vivo", completed: "Finalizado", cancelled: "Cancelado" };

export const BOUT_LEVEL_LABELS: Record<BoutLevel, string> = { pro: "Profesional", amateur: "Amateur" };

export const OUTCOME_LABELS: Record<Outcome, string> = {
  red_win: "Gana la esquina roja",
  blue_win: "Gana la esquina azul",
  draw: "Empate",
  no_contest: "Sin resultado",
};

export const METHOD_LABELS: Record<Method, string> = {
  ko_tko: "KO/TKO",
  decision: "Decisión",
  technical_decision: "Decisión técnica",
  disqualification: "Descalificación",
  no_contest: "Sin resultado",
};

export const KO_TKO_TYPE_LABELS: Record<KoTkoType, string> = {
  ko: "KO",
  tko_referee: "TKO (detención del árbitro)",
  tko_doctor: "TKO (detención médica)",
  rtd: "RTD (retiro en la esquina)",
  tko_injury: "TKO (lesión)",
};

export const DECISION_TYPE_LABELS: Record<DecisionType, string> = { unanimous: "Unánime", split: "Dividida", majority: "Mayoritaria" };

export const NC_REASON_LABELS: Record<NcReason, string> = {
  accidental_foul: "Falta accidental",
  overturned: "Resultado anulado",
  other: "Otro",
};

export const BONUS_LABELS: Record<Bonus, string> = {
  fight_of_night: "Pelea de la noche",
  performance_of_night: "Actuación de la noche",
  ko_of_night: "KO de la noche",
};
