import type { Scorecard } from "@/domain/bout-result";
import type { BoutDTO } from "../dto";
import { scorecardsLine } from "../public-format";

/** Bajo las tarjetas: el resultado y los puntajes como se anuncian; en un final antes del límite, hasta qué round iban. */
export function ScorecardsVerdict({ bout, scorecards }: { bout: BoutDTO; scorecards: Scorecard[] }) {
  const { result } = bout;
  if (!result) return null;
  const winner = result.outcome === "red_win" ? bout.red : result.outcome === "blue_win" ? bout.blue : null;
  const verdict = winner ? `Gana ${winner.firstName} ${winner.lastName}` : result.outcome === "draw" ? "Empate" : "Sin resultado";
  const isDecision = result.method === "decision" || result.method === "technical_decision";
  const scoredRounds = Math.max(0, ...scorecards.map((card) => card.rounds?.length ?? 0));

  return (
    <div data-slot="scorecards-verdict" className="flex flex-col items-center gap-2 bg-black px-5 py-5 text-center">
      <p className="font-cond text-[11px] font-extrabold uppercase tracking-[.14em] text-white/60">Resultado</p>
      <p className="font-display text-[clamp(24px,5vw,40px)] uppercase leading-[.95] sb-gradient-text">
        {verdict} · {result.methodText}
      </p>
      <p className="font-display text-[clamp(20px,4vw,30px)] leading-none text-white tabular-nums">{scorecardsLine(scorecards, result.outcome)}</p>
      {!isDecision ? (
        <p className="font-cond text-sm font-semibold uppercase tracking-[.08em] text-white/70">
          {scoredRounds > 0 ? `Las tarjetas muestran cómo iba la pelea hasta el round ${scoredRounds}` : "Las tarjetas muestran cómo iba la pelea antes del final"}
        </p>
      ) : null}
    </div>
  );
}
