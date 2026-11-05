import type { RoundScore, Scorecard } from "@/domain/bout-result";
import type { BoutDTO } from "../dto";
import { ScorecardsVerdict } from "./scorecards-verdict";

// El pie de cada tarjeta lleva un color distinto por juez (como en las tarjetas oficiales: juez blanco, azul, rojo…).
const JUDGE_TINTS = ["bg-white", "bg-[#dde5fb]", "bg-[#f8cfd2]", "bg-[#fff0c2]", "bg-neutral-100"];

const HEAD = "border-b-2 border-black px-1 py-1.5 text-center font-cond text-[10px] font-extrabold uppercase leading-tight tracking-[.06em] text-black sm:text-[11px]";
const SCORE = "h-10 border-b border-neutral-300 px-1 text-center font-display text-xl leading-none text-black tabular-nums";
const DEDUCTION = "h-10 border-b border-neutral-300 px-1 text-center font-display text-lg leading-none text-[#D7263D] tabular-nums";
const ROUND = "h-10 border-x-2 border-b border-x-black border-b-neutral-300 bg-neutral-100 px-1 text-center font-display text-xl leading-none text-black";

function Corner({ side, firstName, lastName }: { side: "red" | "blue"; firstName: string; lastName: string }) {
  const blue = side === "blue";
  return (
    <div className={`flex flex-col gap-1 p-3 ${blue ? "items-end text-right" : ""}`}>
      <span className={`w-fit px-1.5 py-0.5 font-cond text-[10px] font-extrabold uppercase tracking-[.08em] text-white ${blue ? "bg-[#1E6FD9]" : "bg-[#D7263D]"}`}>
        {blue ? "Esquina azul" : "Esquina roja"}
      </span>
      <p className="font-cond text-[13px] font-bold uppercase leading-none text-black">{firstName}</p>
      <p className="font-display text-lg uppercase leading-none text-black sm:text-xl">{lastName}</p>
    </div>
  );
}

/** Una fila de round: vacía si ese round no se puntuó (no se peleó, o la tarjeta se anotó solo con el total). */
function RoundRow({ number, round }: { number: number; round?: RoundScore }) {
  return (
    <tr>
      <td className={SCORE}>{round?.red ?? ""}</td>
      <td className={DEDUCTION}>{round?.redDeduction ? `−${round.redDeduction}` : ""}</td>
      <th scope="row" className={ROUND}>
        {number}
      </th>
      <td className={DEDUCTION}>{round?.blueDeduction ? `−${round.blueDeduction}` : ""}</td>
      <td className={SCORE}>{round?.blue ?? ""}</td>
    </tr>
  );
}

function JudgeCard({ card, position, bout }: { card: Scorecard; position: number; bout: BoutDTO }) {
  const rounds = card.rounds ?? [];
  return (
    <li className="flex flex-col overflow-hidden border-2 border-black bg-white">
      <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black">
        <Corner side="red" firstName={bout.red.firstName} lastName={bout.red.lastName} />
        <Corner side="blue" firstName={bout.blue.firstName} lastName={bout.blue.lastName} />
      </div>
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Tarjeta de {card.judge}</caption>
        <colgroup>
          <col />
          <col className="w-[18%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              Puntos
            </th>
            <th scope="col" className={HEAD}>
              Desc.
            </th>
            <th scope="col" className={`${HEAD} border-x-2 border-x-black bg-neutral-100`}>
              Round
            </th>
            <th scope="col" className={HEAD}>
              Desc.
            </th>
            <th scope="col" className={HEAD}>
              Puntos
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Todos los rounds de la pelea: los que no se puntuaron quedan en blanco, como en la tarjeta en papel. */}
          {Array.from({ length: bout.scheduledRounds }, (_, index) => (
            <RoundRow key={index} number={index + 1} round={rounds[index]} />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td colSpan={2} className="h-12 text-center font-display text-2xl leading-none text-black tabular-nums">
              {card.red}
            </td>
            <th scope="row" className="border-x-2 border-black bg-neutral-100 text-center font-cond text-[11px] font-extrabold uppercase tracking-[.08em] text-black">
              Total
            </th>
            <td colSpan={2} className="h-12 text-center font-display text-2xl leading-none text-black tabular-nums">
              {card.blue}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className={`mt-auto flex flex-col items-center gap-1.5 border-t-2 border-black px-3 py-3 ${JUDGE_TINTS[position % JUDGE_TINTS.length]}`}>
        <span className="bg-black px-2 py-0.5 font-cond text-[10px] font-extrabold uppercase tracking-[.12em] text-white">Juez {position + 1}</span>
        <h3 className="text-center font-display text-xl uppercase leading-none text-black sm:text-2xl">{card.judge}</h3>
      </div>
    </li>
  );
}

/**
 * Las tarjetas de los jueces como las oficiales (al final de la página de la pelea): las dos esquinas arriba, cada round
 * con el puntaje y los puntos descontados de cada una, el total y el juez. Debajo, el resultado que dicen las tarjetas.
 */
export function JudgesScorecards({ bout, scorecards }: { bout: BoutDTO; scorecards: Scorecard[] }) {
  return (
    <div className="flex flex-col gap-6">
      <ul data-slot="judges-scorecards" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {scorecards.map((card, position) => (
          <JudgeCard key={position} card={card} position={position} bout={bout} />
        ))}
      </ul>
      <ScorecardsVerdict bout={bout} scorecards={scorecards} />
    </div>
  );
}
