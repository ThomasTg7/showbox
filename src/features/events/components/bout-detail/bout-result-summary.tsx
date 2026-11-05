import { ExternalLink } from "lucide-react";
import { BONUS_LABELS } from "@/domain/bout-enums";
import { roundAndTime } from "@/domain/bout-result";
import type { BoutDTO } from "../../dto";
import { roundsLabel } from "../../public-format";

const LABEL = "font-cond text-[11px] font-extrabold uppercase tracking-[.14em] text-white/60";
const VALUE = "font-display text-[clamp(22px,4.6vw,36px)] uppercase leading-none text-white";

/** El resultado de la pelea en un bloque: quién ganó, cómo, dónde terminó, el árbitro, los bonos y el video. */
export function BoutResultSummary({ bout }: { bout: BoutDTO }) {
  const { result } = bout;

  if (bout.status === "cancelled") {
    return (
      <div data-slot="bout-result" className="bg-black p-6 text-center sm:p-8">
        <p className={VALUE}>Pelea cancelada</p>
        {bout.cancelReason ? <p className="mt-2 font-cond text-base font-semibold uppercase tracking-[.06em] text-white/70">{bout.cancelReason}</p> : null}
      </div>
    );
  }

  if (!result) {
    return (
      <div data-slot="bout-result" className="bg-black p-6 text-center sm:p-8">
        <p className={LABEL}>Resultado</p>
        <p className={`mt-2 ${VALUE}`}>Por disputarse</p>
        <p className="mt-2 font-cond text-sm font-semibold uppercase tracking-[.1em] text-white/70">{roundsLabel(bout)}</p>
      </div>
    );
  }

  const winner = result.outcome === "red_win" ? bout.red : result.outcome === "blue_win" ? bout.blue : null;
  const verdict = winner ? `Gana ${winner.firstName} ${winner.lastName}` : result.outcome === "draw" ? "Empate" : "Sin resultado";
  const where = roundAndTime(result);

  return (
    <div data-slot="bout-result" className="flex flex-col gap-6 bg-black p-6 sm:p-8">
      <div className="text-center">
        <p className={LABEL}>Resultado</p>
        <p className="mt-2 font-display text-[clamp(30px,7vw,60px)] uppercase leading-[.95] sb-gradient-text">{verdict}</p>
      </div>
      {/* En celular, un dato bajo otro y centrados; desde `sm`, en una fila (el método ocupa dos columnas). */}
      <dl className="grid grid-cols-1 gap-x-4 gap-y-5 text-center sm:grid-cols-4">
        <div className="sm:col-span-2">
          <dt className={LABEL}>Método</dt>
          <dd className={`mt-1.5 ${VALUE}`}>{result.methodText}</dd>
        </div>
        {where ? (
          <div>
            <dt className={LABEL}>Terminó en</dt>
            <dd className={`mt-1.5 ${VALUE}`}>{where}</dd>
          </div>
        ) : null}
        {result.referee ? (
          <div>
            <dt className={LABEL}>Árbitro</dt>
            <dd className="mt-1.5 font-cond text-lg font-bold uppercase tracking-[.04em] text-white">{result.referee}</dd>
          </div>
        ) : null}
      </dl>
      {result.bonuses.length > 0 ? (
        <ul aria-label="Bonos" className="flex flex-wrap justify-center gap-2">
          {result.bonuses.map((bonus) => (
            <li key={bonus} className="bg-brand px-3 py-1 font-cond text-xs font-extrabold uppercase tracking-[.12em] text-white">
              ★ {BONUS_LABELS[bonus]}
            </li>
          ))}
        </ul>
      ) : null}
      {result.videoUrl ? (
        <a
          href={result.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto inline-flex min-h-11 items-center gap-2 border-2 border-brand px-5 font-cond text-sm font-extrabold uppercase tracking-[.1em] text-white hover:bg-brand hover:text-white"
        >
          Ver la pelea <ExternalLink aria-hidden className="size-4" />
        </a>
      ) : null}
    </div>
  );
}
