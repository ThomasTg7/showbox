import Link from "next/link";
import { Flag } from "@/components/ui-gc/flag";
import { formatWeight } from "@/domain/units";
import type { FighterCardDTO } from "../dto";
import { divisionTitle } from "../labels";
import { FighterName } from "./fighter-name";
import { FighterFigure } from "./fighter-photo";
import { CountFigures } from "./count-figures";

export const FIGHTER_CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

type FighterCardProps = {
  fighter: FighterCardDTO;
  /** Solo la foto de la primera fila (la que aparece sin hacer scroll) se pide con prioridad. */
  priority?: boolean;
  /** Etiqueta sobre la foto ("Campeón", "#3"). */
  badge?: string;
  /** Número grande de fondo (la `.bgnum` de la maqueta): "C" o el puesto. Solo decorativo. */
  backdrop?: string;
  /** Nivel del nombre según donde esté la tarjeta (h2 bajo el h1 de un listado, h3 dentro de una sección de la home). */
  heading?: "h2" | "h3";
};

function recordFigures({ record }: FighterCardDTO) {
  return [
    { label: "Vict.", value: record.wins, accent: true },
    { label: "Derr.", value: record.losses },
    { label: "Emp.", value: record.draws },
  ];
}

function divisionLabel(division: FighterCardDTO["division"]): string {
  return `${divisionTitle(division)} · ${formatWeight(division.limitKg)}`;
}

/** Tarjeta del listado (estilo `.fcard` de la maqueta). Toda la tarjeta es un solo enlace a la ficha. */
export function FighterCard({ fighter, priority = false, badge, backdrop, heading: Heading = "h2" }: FighterCardProps) {

  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-border bg-[linear-gradient(170deg,#1c1c1c,#0a0a0a_70%)] transition-opacity duration-300 focus-within:border-brand focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-bright hover:border-brand">
      <div data-slot="fighter-card-photo" className="relative h-[clamp(210px,36vw,340px)] overflow-hidden sm:h-[clamp(240px,26vw,340px)]">
        <FighterFigure
          fighter={fighter}
          sizes={FIGHTER_CARD_SIZES}
          priority={priority}
          bodyFit="object-contain"
          imageClassName="absolute inset-0 transition-transform duration-700 ease-sb motion-safe:group-hover:scale-105"
          silhouetteClassName="absolute bottom-[-4%] left-1/2 h-[108%] -translate-x-1/2 text-black drop-shadow-[0_0_2px_rgba(255,59,71,.55)] transition-transform duration-700 ease-sb motion-safe:group-hover:scale-105"
        />
        {backdrop ? (
          <span
            data-slot="fighter-card-backdrop"
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1.5 font-display text-[clamp(72px,12vw,120px)] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,59,71,.25)]"
          >
            {backdrop}
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0c0c] to-transparent" />
        {badge ? (
          <span data-slot="fighter-card-badge" className="absolute bottom-12 left-3 z-10 bg-brand px-2 py-1 font-cond text-[11px] font-extrabold uppercase tracking-[.12em] text-white">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="relative -mt-8 flex flex-1 flex-col px-4 pb-4 sm:px-6 sm:pb-6">
        {fighter.nickname ? (
          <p className="font-cond text-[13px] font-bold tracking-[.1em] text-accent-bright sm:text-sm">“{fighter.nickname}”</p>
        ) : null}
        <Heading className="my-1 font-display text-[clamp(24px,5vw,36px)] uppercase leading-[.95] text-white">
          <Link href={`/boxeadores/${fighter.slug}`} className="outline-none after:absolute after:inset-0">
            <FighterName firstName={fighter.firstName} lastName={fighter.lastName} />
          </Link>
        </Heading>
        <p className="flex items-start gap-2 font-cond text-[12px] font-semibold uppercase tracking-[.08em] text-muted-foreground sm:text-[13px]">
          <Flag code={fighter.nationality} className="mt-px shrink-0" />
          <span>{divisionLabel(fighter.division)}</span>
        </p>
        <div className="mt-auto pt-4">
          <CountFigures items={recordFigures(fighter)} className="grid grid-cols-3 border-t border-border" />
        </div>
      </div>
    </article>
  );
}
