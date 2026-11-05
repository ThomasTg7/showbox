"use client";

import { Input } from "@/components/ui/input";
import type { RoundScoreDraft, ScorecardDraft } from "../result-draft";

const EMPTY_ROUND: RoundScoreDraft = { red: "", blue: "", redDeduction: "", blueDeduction: "" };

/** Los rounds de la tarjeta, completados con filas vacías hasta `count`. */
function roundsOf(card: ScorecardDraft, count: number): RoundScoreDraft[] {
  const rounds = card.rounds ?? [];
  return Array.from({ length: count }, (_, index) => rounds[index] ?? EMPTY_ROUND);
}

/** Suma de puntajes menos descuentos; `null` mientras falte algún puntaje. */
function total(rounds: RoundScoreDraft[], side: "red" | "blue"): number | null {
  let sum = 0;
  for (const round of rounds) {
    const score = Number(round[side]);
    const deduction = Number(round[side === "red" ? "redDeduction" : "blueDeduction"] || 0);
    if (!round[side].trim() || !Number.isFinite(score) || !Number.isFinite(deduction)) return null;
    sum += score - deduction;
  }
  return sum;
}

const SMALL = "h-9 px-1 text-center text-sm";

type ScorecardRoundsGridProps = {
  card: ScorecardDraft;
  /** Número de la tarjeta (para los nombres accesibles). */
  number: number;
  roundCount: number;
  redName: string;
  blueName: string;
  onChange: (rounds: RoundScoreDraft[]) => void;
};

/** Una tarjeta round por round: el puntaje y el descuento de cada esquina en cada round, y el total sumado solo. */
export function ScorecardRoundsGrid({ card, number, roundCount, redName, blueName, onChange }: ScorecardRoundsGridProps) {
  if (roundCount === 0) return null;
  const rounds = roundsOf(card, roundCount);
  const [red, blue] = [total(rounds, "red"), total(rounds, "blue")];
  const updateRound = (round: number, changes: Partial<RoundScoreDraft>) => onChange(rounds.map((score, position) => (position === round ? { ...score, ...changes } : score)));
  const scoreLabel = (round: number, name: string) => `Tarjeta ${number}, round ${round}: puntos de ${name}`;
  const deductionLabel = (round: number, name: string) => `Tarjeta ${number}, round ${round}: descuento a ${name}`;

  return (
    <div className="grid grid-cols-[2rem_1fr_2.75rem_1fr_2.75rem] items-center gap-x-1.5 gap-y-1.5 text-xs text-muted-foreground">
      <span />
      <span className="truncate text-center">{redName}</span>
      <span className="text-center" title="Puntos descontados">
        Desc.
      </span>
      <span className="truncate text-center">{blueName}</span>
      <span className="text-center" title="Puntos descontados">
        Desc.
      </span>
      {rounds.map((round, roundIndex) => {
        const roundNumber = roundIndex + 1;
        return (
          <div key={roundIndex} className="contents">
            <span className="font-medium">R{roundNumber}</span>
            <Input aria-label={scoreLabel(roundNumber, redName)} value={round.red} onChange={(event) => updateRound(roundIndex, { red: event.target.value })} inputMode="numeric" placeholder="10" className="h-9 text-center" />
            <Input aria-label={deductionLabel(roundNumber, redName)} value={round.redDeduction ?? ""} onChange={(event) => updateRound(roundIndex, { redDeduction: event.target.value })} inputMode="numeric" placeholder="–" className={SMALL} />
            <Input aria-label={scoreLabel(roundNumber, blueName)} value={round.blue} onChange={(event) => updateRound(roundIndex, { blue: event.target.value })} inputMode="numeric" placeholder="9" className="h-9 text-center" />
            <Input aria-label={deductionLabel(roundNumber, blueName)} value={round.blueDeduction ?? ""} onChange={(event) => updateRound(roundIndex, { blueDeduction: event.target.value })} inputMode="numeric" placeholder="–" className={SMALL} />
          </div>
        );
      })}
      <span className="font-medium">Total</span>
      <output className="text-center text-sm text-foreground tabular-nums" aria-label={`Tarjeta ${number}: total de ${redName}`}>
        {red ?? "–"}
      </output>
      <span />
      <output className="text-center text-sm text-foreground tabular-nums" aria-label={`Tarjeta ${number}: total de ${blueName}`}>
        {blue ?? "–"}
      </output>
      <span />
    </div>
  );
}
