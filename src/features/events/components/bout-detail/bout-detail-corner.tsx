import Link from "next/link";
import { Flag } from "@/components/ui-gc/flag";
import { countryName } from "@/domain/units";
import { FighterName } from "@/features/fighters/components/fighter-name";
import { FighterFigure } from "@/features/fighters/components/fighter-photo";
import type { BoutFighterDTO } from "../../dto";
import { BoutRankBadge } from "../bout-rank-badge";
import { VictoryTag } from "../victory-tag";

type BoutDetailCornerProps = {
  fighter: BoutFighterDTO;
  side: "red" | "blue";
  won: boolean;
  /** `C` (campeón) o `#n` según el ranking de hoy. */
  rankLabel?: string;
  gender: "male" | "female";
};

const CORNER_COLOR = { red: "border-[#D7263D]", blue: "border-[#1E6FD9]" } as const;
const CORNER_NAME = { red: "Esquina roja", blue: "Esquina azul" } as const;

/** Una esquina en la página de la pelea: foto grande (con «Victoria» sobre sus pies si ganó), ranking, nombre, país y récord. */
export function BoutDetailCorner({ fighter, side, won, rankLabel, gender }: BoutDetailCornerProps) {
  const record = fighter.record;
  return (
    <div data-corner={side} className={`flex min-w-0 flex-col gap-3 ${side === "blue" ? "items-end text-right" : ""}`}>
      <div className="w-full max-w-[260px]">
        {rankLabel ? <BoutRankBadge rankLabel={rankLabel} gender={gender} /> : null}
        <div data-slot="bout-face" className={`relative aspect-[4/5] w-full overflow-hidden border-b-[6px] bg-gradient-to-b from-neutral-100 to-neutral-200 ${CORNER_COLOR[side]}`}>
          <FighterFigure
            fighter={fighter}
            sizes="(min-width: 640px) 260px, 44vw"
            silhouetteClassName={`absolute bottom-0 left-1/2 h-[92%] -translate-x-1/2 text-neutral-900 ${side === "blue" ? "-scale-x-100" : ""}`}
          />
          {won ? <VictoryTag size="lg" /> : null}
        </div>
      </div>
      <span className="font-cond text-[11px] font-extrabold uppercase tracking-[.14em] text-neutral-500">{CORNER_NAME[side]}</span>
      <h2 className="w-full min-w-0 font-display text-[clamp(26px,6.5vw,52px)] uppercase leading-[.95] text-black">
        {fighter.isPublic ? (
          <Link href={`/boxeadores/${fighter.slug}`} className="underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:decoration-brand focus-visible:decoration-[3px]">
            <FighterName firstName={fighter.firstName} lastName={fighter.lastName} />
          </Link>
        ) : (
          <FighterName firstName={fighter.firstName} lastName={fighter.lastName} />
        )}
      </h2>
      {fighter.nickname ? <p className="font-cond text-sm font-semibold tracking-[.06em] text-neutral-500">“{fighter.nickname}”</p> : null}
      <p className={`flex flex-wrap items-center gap-2 font-cond text-sm font-semibold uppercase tracking-[.06em] text-neutral-700 sm:text-base ${side === "blue" ? "flex-row-reverse" : ""}`}>
        <Flag code={fighter.nationality} />
        <span>{countryName(fighter.nationality)}</span>
      </p>
      <p className="font-display text-[clamp(22px,4.5vw,32px)] leading-none text-black tabular-nums">
        {record.wins}-{record.losses}-{record.draws}
        <span className="ml-2 font-cond text-xs font-bold uppercase tracking-[.12em] text-neutral-500">Récord</span>
      </p>
    </div>
  );
}
