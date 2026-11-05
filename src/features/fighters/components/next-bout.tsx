import Link from "next/link";
import type { FightHistoryRow, NextBoutDTO, OpponentDTO } from "@/features/events/dto";
import { boutMeasure, roundsLabel } from "@/features/events/public-format";
import { formatDate, formatLongDate, formatTime } from "@/lib/format-date";
import { FighterFace } from "./fighter-photo";

type NextBoutProps = { nextBout: NextBoutDTO | null; lastFight: FightHistoryRow | null };

const RESULT_TEXT = { win: "Victoria", loss: "Derrota", draw: "Empate", no_contest: "Sin resultado" } as const;
const RESULT_CLASS = { win: "bg-brand text-white", loss: "bg-neutral-700 text-white", draw: "bg-neutral-800 text-neutral-200", no_contest: "bg-neutral-800 text-neutral-200" } as const;

function OpponentPhoto({ opponent }: { opponent: OpponentDTO }) {
  const photo = (
    <div className="relative h-[104px] w-[84px] overflow-hidden border-b-4 border-brand bg-surface sm:h-[132px] sm:w-[106px]">
      <FighterFace
        fighter={opponent}
        sizes="(min-width: 640px) 106px, 84px"
        silhouetteClassName="absolute -bottom-1 left-1/2 h-[112%] -translate-x-1/2 text-black drop-shadow-[0_0_2px_rgba(255,59,71,.55)]"
      />
    </div>
  );
  return (
    <div data-slot="opponent-photo" className="shrink-0">
      {opponent.isPublic ? (
        <Link href={`/boxeadores/${opponent.slug}`} tabIndex={-1} aria-label={`${opponent.firstName} ${opponent.lastName}`}>
          {photo}
        </Link>
      ) : (
        photo
      )}
    </div>
  );
}

function OpponentName({ opponent }: { opponent: OpponentDTO }) {
  const name = `${opponent.firstName} ${opponent.lastName}`;
  return opponent.isPublic ? (
    <Link href={`/boxeadores/${opponent.slug}`} className="underline-offset-4 hover:underline focus-visible:underline">
      {name}
    </Link>
  ) : (
    <>{name}</>
  );
}

const chipClass = "inline-flex items-center border border-border px-2.5 py-1 font-cond text-xs font-extrabold uppercase tracking-[.1em] text-white";

/** Una pelea (próxima o última): la foto del rival, su nombre con los datos de la pelea y, al lado, el evento. */
function BoutCard({ kicker, opponent, chips, event }: { kicker: string; opponent: OpponentDTO; chips: React.ReactNode; event: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
      <OpponentPhoto opponent={opponent} />
      <div className="min-w-0 flex-1">
        <h2 id="fighter-next-bout-heading" className="font-cond text-[13px] font-extrabold uppercase tracking-[.2em] text-accent-bright">
          {kicker}
        </h2>
        <p className="mt-1.5 font-display text-[clamp(26px,4vw,40px)] uppercase leading-none text-white">
          <span className="mr-2 text-[.5em] text-muted-foreground">vs</span>
          <OpponentName opponent={opponent} />
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">{chips}</div>
      </div>
      <div className="font-cond text-base font-bold uppercase tracking-[.08em] text-white sm:max-w-[260px] sm:border-l sm:border-border sm:pl-6 sm:text-left">{event}</div>
    </div>
  );
}

/**
 * Bajo el hero: la próxima pelea del boxeador (foto del rival, datos de la pelea, evento y fecha) o, si no tiene una
 * programada, la última que peleó (spec §3). Sin ninguna de las dos no se muestra nada.
 */
export function NextBout({ nextBout, lastFight }: NextBoutProps) {
  if (!nextBout && !lastFight) return null;

  let card: React.ReactNode;
  if (nextBout) {
    const start = new Date(nextBout.event.startsAt);
    const measure = boutMeasure({ catchweightKg: nextBout.catchweightKg, division: nextBout.divisionName && nextBout.divisionGender ? { name: nextBout.divisionName, gender: nextBout.divisionGender } : null });
    card = (
      <BoutCard
        kicker="Próxima pelea"
        opponent={nextBout.opponent}
        chips={[nextBout.isTitleFight ? "★ Por el título" : "", measure, roundsLabel(nextBout)].filter(Boolean).map((text) => (
          <span key={text} className={chipClass}>
            {text}
          </span>
        ))}
        event={
          <>
            <Link href={`/eventos/${nextBout.event.slug}`} className="block text-lg underline-offset-4 hover:underline focus-visible:underline">
              {nextBout.event.name}
            </Link>
            <span className="mt-1 block text-sm font-semibold text-muted-foreground">{formatLongDate(start)}</span>
            <span className="block text-sm font-semibold text-muted-foreground">
              {formatTime(start)} hrs · {nextBout.event.venueCity}
            </span>
          </>
        }
      />
    );
  } else if (lastFight) {
    card = (
      <BoutCard
        kicker="Última pelea"
        opponent={lastFight.opponent}
        chips={
          <>
            <span className={`inline-flex items-center px-2.5 py-1 font-cond text-xs font-extrabold uppercase tracking-[.1em] ${RESULT_CLASS[lastFight.fighterResult]}`}>{RESULT_TEXT[lastFight.fighterResult]}</span>
            <span className={chipClass}>{lastFight.methodText}</span>
            {lastFight.roundTime ? <span className={chipClass}>{lastFight.roundTime}</span> : null}
          </>
        }
        event={
          <>
            <Link href={`/eventos/${lastFight.eventSlug}`} className="block text-lg underline-offset-4 hover:underline focus-visible:underline">
              {lastFight.eventName}
            </Link>
            <span className="mt-1 block text-sm font-semibold text-muted-foreground">{formatDate(new Date(lastFight.date))}</span>
          </>
        }
      />
    );
  }

  return (
    <section aria-labelledby="fighter-next-bout-heading" data-slot="fighter-next-bout" className="border-y border-border bg-[#0f0f0f]">
      <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] py-6 lg:py-8">{card}</div>
    </section>
  );
}
