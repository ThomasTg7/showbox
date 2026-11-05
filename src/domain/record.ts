export type BoutOutcomeForRecord = {
  boutId: string;
  date: Date;
  level: "pro" | "amateur";
  redFighterId: string;
  blueFighterId: string;
  outcome: "red_win" | "blue_win" | "draw" | "no_contest";
  method: "ko_tko" | "decision" | "technical_decision" | "disqualification" | "no_contest";
  endRound: number;
  endTimeSeconds: number;
  roundSeconds: number;
};

export type MethodCounts = { koTko: number; decision: number; dq: number };

export type ComputedRecord = {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
  winsBy: MethodCounts;
  lossesBy: MethodCounts;
  /** Racha actual: los sin resultado no la cortan ni la suman. `null` si no hay peleas decididas. */
  streak: { type: "win" | "loss" | "draw"; count: number } | null;
  /** Porcentaje de nocauts: victorias por KO/TKO ÷ victorias; `null` sin victorias. */
  finishRate: number | null;
  /** Promedio de todas las peleas del nivel (también las sin resultado: duraron igual). */
  avgFightSeconds: number | null;
};

export type FighterResult = "win" | "loss" | "draw" | "no_contest";

const emptyMethods = (): MethodCounts => ({ koTko: 0, decision: 0, dq: 0 });

/** Segundos que duró la pelea: los rounds completos anteriores al último más el tiempo del último. */
export function fightSeconds(bout: Pick<BoutOutcomeForRecord, "endRound" | "endTimeSeconds" | "roundSeconds">): number {
  return (bout.endRound - 1) * bout.roundSeconds + bout.endTimeSeconds;
}

/** Cómo terminó la pelea para ese boxeador (gana la esquina roja o la azul → victoria o derrota). */
export function resultFor(bout: Pick<BoutOutcomeForRecord, "outcome" | "redFighterId">, fighterId: string): FighterResult {
  if (bout.outcome === "draw") return "draw";
  if (bout.outcome === "no_contest") return "no_contest";
  const fighterIsRed = bout.redFighterId === fighterId;
  return (bout.outcome === "red_win") === fighterIsRed ? "win" : "loss";
}

/** La decisión técnica cuenta como decisión; una pelea sin resultado no suma a ningún método. */
function methodKey(method: BoutOutcomeForRecord["method"]): keyof MethodCounts | null {
  switch (method) {
    case "ko_tko":
      return "koTko";
    case "decision":
    case "technical_decision":
      return "decision";
    case "disqualification":
      return "dq";
    default:
      return null;
  }
}

function currentStreak(results: FighterResult[]): ComputedRecord["streak"] {
  const decided = results.filter((result): result is "win" | "loss" | "draw" => result !== "no_contest");
  const last = decided.at(-1);
  if (!last) return null;
  let count = 0;
  for (let index = decided.length - 1; index >= 0 && decided[index] === last; index -= 1) count += 1;
  return { type: last, count };
}

/** Récord del boxeador en la promotora, calculado desde las peleas con resultado (nunca se guarda). */
export function computeRecord(bouts: BoutOutcomeForRecord[], fighterId: string, level: "pro" | "amateur"): ComputedRecord {
  const fights = bouts
    .filter((bout) => bout.level === level && (bout.redFighterId === fighterId || bout.blueFighterId === fighterId))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const record = { wins: 0, losses: 0, draws: 0, noContests: 0, winsBy: emptyMethods(), lossesBy: emptyMethods() };
  const results: FighterResult[] = [];

  for (const bout of fights) {
    const result = resultFor(bout, fighterId);
    results.push(result);
    const method = methodKey(bout.method);

    if (result === "win") {
      record.wins += 1;
      if (method) record.winsBy[method] += 1;
    } else if (result === "loss") {
      record.losses += 1;
      if (method) record.lossesBy[method] += 1;
    } else if (result === "draw") {
      record.draws += 1;
    } else {
      record.noContests += 1;
    }
  }

  return {
    ...record,
    streak: currentStreak(results),
    finishRate: record.wins === 0 ? null : record.winsBy.koTko / record.wins,
    avgFightSeconds: fights.length === 0 ? null : fights.reduce((total, bout) => total + fightSeconds(bout), 0) / fights.length,
  };
}
