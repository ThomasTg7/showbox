import {
  BONUSES,
  DECISION_TYPE_LABELS,
  KO_TKO_TYPE_LABELS,
  NC_REASON_LABELS,
  type Bonus,
  type DecisionType,
  type KoTkoType,
  type Method,
  type NcReason,
  type Outcome,
  type ScheduledRounds,
} from "./bout-enums";
import { formatClock } from "./clock";

/** Un round en la tarjeta de un juez: el puntaje de cada esquina y, si hubo, los puntos descontados (por faltas). */
export type RoundScore = { red: number; blue: number; redDeduction?: number; blueDeduction?: number };

/**
 * Tarjeta de un juez: el total de cada esquina y, si se anotó round por round, el puntaje de cada round (entonces el
 * total es la suma).
 */
export type Scorecard = { judge: string; red: number; blue: number; rounds?: RoundScore[] | null };

export const MAX_SCORECARDS = 5;
const MAX_ROUND_SCORE = 10;
const MAX_DEDUCTION = 5;

/**
 * Cuántos rounds se puntúan en las tarjetas: todos en una decisión; hasta el round en que se detuvo en una decisión
 * técnica; en un final antes del límite (KO, TKO, RTD…), los rounds ya terminados (las tarjetas muestran cómo iba). Sin
 * round todavía, todos.
 */
export function scoredRounds(result: { method: Method | ""; endRound: number | null }, scheduledRounds: number): number {
  if (result.method === "decision" || result.endRound === null) return scheduledRounds;
  const stoppedAt = Math.min(result.endRound, scheduledRounds);
  return result.method === "technical_decision" ? stoppedAt : Math.max(stoppedAt - 1, 0);
}

/** El total de una tarjeta anotada round por round: la suma de los puntajes menos los descuentos. */
export function roundsTotal(rounds: RoundScore[]): { red: number; blue: number } {
  return rounds.reduce(
    (total, round) => ({ red: total.red + round.red - (round.redDeduction ?? 0), blue: total.blue + round.blue - (round.blueDeduction ?? 0) }),
    { red: 0, blue: 0 },
  );
}

export type BoutResultInput = {
  outcome: Outcome;
  method: Method;
  koTkoType?: KoTkoType | null;
  decisionType?: DecisionType | null;
  dqReason?: string | null;
  ncReason?: NcReason | null;
  ncNote?: string | null;
  endRound?: number | null;
  endTimeSeconds?: number | null;
  referee?: string | null;
  scorecards?: Scorecard[] | null;
  bonuses?: Bonus[] | null;
  videoUrl?: string | null;
  notes?: string | null;
};

export type BoutContext = { scheduledRounds: ScheduledRounds; roundSeconds: number };

/** Resultado listo para guardar: los mismos nombres que las columnas de `bouts`; lo que no aplica al método va en `null`. */
export type NormalizedResult = {
  outcome: Outcome;
  method: Method;
  koTkoType: KoTkoType | null;
  decisionType: DecisionType | null;
  dqReason: string | null;
  ncReason: NcReason | null;
  ncNote: string | null;
  endRound: number;
  endTimeSeconds: number;
  referee: string | null;
  scorecards: Scorecard[] | null;
  bonuses: Bonus[];
  videoUrl: string | null;
  notes: string | null;
};

export type ValidationResult = { ok: true; value: NormalizedResult } | { ok: false; errors: Record<string, string> };

/** Sistema de 10 puntos: como máximo 12 rounds × 10. */
const MAX_SCORE = 120;
const DRAW_METHODS: readonly Method[] = ["decision", "technical_decision"];

function trimmed(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** Un ganador y un método que no se contradicen (spec §4.5). */
function coherenceError(outcome: Outcome, method: Method): string | null {
  if (outcome === "no_contest") return method === "no_contest" ? null : "Un sin resultado no lleva otro método";
  if (method === "no_contest") return "Elige cómo terminó la pelea";
  if (outcome === "draw" && !DRAW_METHODS.includes(method)) return "Un empate solo puede ser por decisión";
  return null;
}

const isScore = (score: number, max: number) => Number.isInteger(score) && score >= 0 && score <= max;

function validateScorecards(scorecards: Scorecard[] | null | undefined, roundLimit: number): { value: Scorecard[] | null; error?: string } {
  if (!scorecards || scorecards.length === 0) return { value: null };
  if (scorecards.length > MAX_SCORECARDS) return { value: null, error: `Máximo ${MAX_SCORECARDS} tarjetas` };
  const cleaned: Scorecard[] = [];
  for (const card of scorecards) {
    const judge = card.judge.trim();
    if (!judge) return { value: null, error: "Cada tarjeta necesita el nombre del juez" };

    if (card.rounds && card.rounds.length > 0) {
      if (card.rounds.length > roundLimit) return { value: null, error: `La tarjeta tiene más rounds de los que se puntúan (${roundLimit})` };
      if (card.rounds.some((round) => !isScore(round.red, MAX_ROUND_SCORE) || !isScore(round.blue, MAX_ROUND_SCORE))) {
        return { value: null, error: `Cada round se puntúa con números enteros de 0 a ${MAX_ROUND_SCORE}` };
      }
      if (card.rounds.some((round) => !isScore(round.redDeduction ?? 0, MAX_DEDUCTION) || !isScore(round.blueDeduction ?? 0, MAX_DEDUCTION))) {
        return { value: null, error: `Los descuentos son números enteros de 0 a ${MAX_DEDUCTION}` };
      }
      // Un descuento en 0 no se guarda: la tarjeta pública solo muestra los que hubo.
      const rounds: RoundScore[] = card.rounds.map((round) => ({
        red: round.red,
        blue: round.blue,
        ...(round.redDeduction ? { redDeduction: round.redDeduction } : {}),
        ...(round.blueDeduction ? { blueDeduction: round.blueDeduction } : {}),
      }));
      cleaned.push({ judge, ...roundsTotal(rounds), rounds });
      continue;
    }

    if (!isScore(card.red, MAX_SCORE) || !isScore(card.blue, MAX_SCORE)) {
      return { value: null, error: `Los puntajes deben ser números enteros entre 0 y ${MAX_SCORE}` };
    }
    cleaned.push({ judge, red: card.red, blue: card.blue });
  }
  return { value: cleaned };
}

function validVideoUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Comprueba y normaliza el resultado de una pelea. En decisión, el round y el tiempo vacíos se completan
 * (último round, tiempo completo); en decisión técnica solo el round (el tiempo en que se detuvo hay que indicarlo).
 */
export function validateBoutResult(input: BoutResultInput, ctx: BoutContext): ValidationResult {
  const { outcome, method } = input;
  const incoherent = coherenceError(outcome, method);
  if (incoherent) return { ok: false, errors: { method: incoherent } };

  const errors: Record<string, string> = {};

  const koTkoType = method === "ko_tko" ? (input.koTkoType ?? null) : null;
  if (method === "ko_tko" && !koTkoType) errors.koTkoType = "Elige el tipo de KO/TKO";

  const isDecision = method === "decision" || method === "technical_decision";
  const decisionType = isDecision ? (input.decisionType ?? null) : null;
  if (isDecision && !decisionType) errors.decisionType = "Elige el tipo de decisión";

  const dqReason = method === "disqualification" ? trimmed(input.dqReason) : null;
  if (method === "disqualification" && !dqReason) errors.dqReason = "Indica el motivo de la descalificación";

  const ncReason = method === "no_contest" ? (input.ncReason ?? null) : null;
  if (method === "no_contest" && !ncReason) errors.ncReason = "Elige el motivo";
  const ncNote = method === "no_contest" ? trimmed(input.ncNote) : null;

  let endRound = input.endRound ?? null;
  let endTimeSeconds = input.endTimeSeconds ?? null;
  if (endRound === null && isDecision) endRound = ctx.scheduledRounds;
  if (endTimeSeconds === null && method === "decision") endTimeSeconds = ctx.roundSeconds;

  if (endRound === null) errors.endRound = "Elige el round";
  else if (!Number.isInteger(endRound) || endRound < 1) errors.endRound = "Elige un round válido";
  else if (endRound > ctx.scheduledRounds) errors.endRound = `El round no puede ser mayor a ${ctx.scheduledRounds}`;

  if (endTimeSeconds === null) errors.endTimeSeconds = "Indica el tiempo (m:ss)";
  else if (!Number.isInteger(endTimeSeconds) || endTimeSeconds <= 0) errors.endTimeSeconds = "El tiempo debe ser mayor a 0:00";
  else if (endTimeSeconds > ctx.roundSeconds) errors.endTimeSeconds = `El tiempo no puede superar ${formatClock(ctx.roundSeconds)}`;

  // Opcionales en cualquier final: en uno antes del límite muestran cómo iba la pelea.
  const scorecards = validateScorecards(input.scorecards, scoredRounds({ method, endRound }, ctx.scheduledRounds));
  if (scorecards.error) errors.scorecards = scorecards.error;

  const videoUrl = trimmed(input.videoUrl);
  if (videoUrl && !validVideoUrl(videoUrl)) errors.videoUrl = "El enlace del video no es válido (debe empezar con https://)";

  const bonuses = [...new Set(input.bonuses ?? [])];
  if (bonuses.some((bonus) => !BONUSES.includes(bonus))) errors.bonuses = "Bono no válido";

  if (Object.keys(errors).length > 0 || endRound === null || endTimeSeconds === null) return { ok: false, errors };

  return {
    ok: true,
    value: {
      outcome,
      method,
      koTkoType,
      decisionType,
      dqReason,
      ncReason,
      ncNote,
      endRound,
      endTimeSeconds,
      referee: trimmed(input.referee),
      scorecards: scorecards.value,
      bonuses,
      videoUrl,
      notes: trimmed(input.notes),
    },
  };
}

/**
 * Con 3 a 5 tarjetas, qué resultado y qué tipo de decisión corresponden. Gana quien se lleva más de la mitad de las
 * tarjetas (unánime si todas; dividida si el rival ganó alguna; mayoritaria si las demás son empate). Si nadie la tiene,
 * es empate: unánime si todas empatan, mayoritario si empatan más de la mitad, dividido si no.
 */
export function suggestDecisionType(
  scorecards: { red: number; blue: number }[],
): { outcome: "red_win" | "blue_win" | "draw"; decisionType: DecisionType } | null {
  const total = scorecards.length;
  if (total < 3 || total > MAX_SCORECARDS) return null;

  const red = scorecards.filter((card) => card.red > card.blue).length;
  const blue = scorecards.filter((card) => card.blue > card.red).length;
  const draws = total - red - blue;

  for (const [side, won, lost] of [["red_win", red, blue], ["blue_win", blue, red]] as const) {
    if (won * 2 > total) return { outcome: side, decisionType: won === total ? "unanimous" : lost > 0 ? "split" : "majority" };
  }
  return { outcome: "draw", decisionType: draws === total ? "unanimous" : draws * 2 > total ? "majority" : "split" };
}

export type ResultLineInput = Pick<
  NormalizedResult,
  "outcome" | "method" | "koTkoType" | "decisionType" | "dqReason" | "ncReason" | "ncNote" | "endRound" | "endTimeSeconds"
> & { redName: string; blueName: string };

function decisionText(base: string, type: DecisionType | null): string {
  return type ? `${base} ${DECISION_TYPE_LABELS[type].toLowerCase()}` : base;
}

export type MethodTextInput = Pick<NormalizedResult, "method" | "koTkoType" | "decisionType" | "dqReason">;

/** "KO" · "TKO (detención del árbitro)" · "RTD (retiro en la esquina)" · "Decisión unánime" · "Descalificación (Golpe bajo)". */
export function formatMethod(result: MethodTextInput): string {
  switch (result.method) {
    case "ko_tko":
      return result.koTkoType ? KO_TKO_TYPE_LABELS[result.koTkoType] : "KO/TKO";
    case "decision":
      return decisionText("Decisión", result.decisionType);
    case "technical_decision":
      return decisionText("Decisión técnica", result.decisionType);
    case "disqualification":
      return result.dqReason ? `Descalificación (${result.dqReason})` : "Descalificación";
    case "no_contest":
      return "Sin resultado";
  }
}

/**
 * «R2 3:42»: dónde terminó la pelea. Una decisión llega al final, así que no lo lleva (`null`); una decisión técnica sí,
 * porque la pelea se detuvo.
 */
export function roundAndTime(result: Pick<NormalizedResult, "method" | "endRound" | "endTimeSeconds">): string | null {
  return result.method === "decision" ? null : `R${result.endRound} ${formatClock(result.endTimeSeconds)}`;
}

/** "Pérez vence a Soto · KO · R2 2:42" · "Pérez vence a Soto · Decisión unánime" · "Pérez y Soto empatan · Decisión dividida" · "Pérez vs Soto · Sin resultado (falta accidental)". */
export function formatResultLine(result: ResultLineInput): string {
  const { redName, blueName } = result;

  if (result.outcome === "no_contest") {
    const reason = result.ncReason === "other" ? (result.ncNote ?? "otro") : result.ncReason ? NC_REASON_LABELS[result.ncReason].toLowerCase() : null;
    return `${redName} vs ${blueName} · Sin resultado${reason ? ` (${reason})` : ""}`;
  }
  const [winner, loser] = result.outcome === "red_win" ? [redName, blueName] : [blueName, redName];
  const who = result.outcome === "draw" ? `${redName} y ${blueName} empatan` : `${winner} vence a ${loser}`;
  return [who, formatMethod(result), roundAndTime(result)].filter(Boolean).join(" · ");
}
