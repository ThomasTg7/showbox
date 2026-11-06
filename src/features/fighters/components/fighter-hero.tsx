import { ArenaBackdrop } from "@/components/brand/arena-backdrop";
import { AutoFitText } from "@/components/ui-gc/auto-fit-text";
import { Flag } from "@/components/ui-gc/flag";
import { Tag } from "@/components/ui-gc/tag";
import { countryName, formatWeight } from "@/domain/units";
import type { FighterProfileDTO } from "../dto";
import { CAREER_STATUS_LABELS, divisionTitle } from "../labels";
import { formatRecord } from "./record-summary";
import { CountFigures, type CountFigure } from "./count-figures";
import { FighterFigure } from "./fighter-photo";
import { HeroParallax } from "./hero-parallax";

/** La foto del hero es la imagen LCP: ocupa todo el ancho en celular y ~40 % en escritorio. */
export const FIGHTER_HERO_SIZES = "(min-width: 1024px) 40vw, 100vw";

type FighterHeroProps = {
  fighter: FighterProfileDTO;
  /** Las tres cifras grandes. */
  figures: CountFigure[];
  /** Etiquetas de campeón y ranking ("Campeón pro · Peso Ligero", "#3 P4P"): van junto a la división y el estado; los títulos se destacan. */
  rankingTags?: { label: string; isTitle: boolean }[];
};

export function FighterHero({ fighter, figures, rankingTags = [] }: FighterHeroProps) {
  return (
    <>
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-black pt-[76px]" aria-labelledby="fighter-name">
        <ArenaBackdrop />
        <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col px-[clamp(16px,4vw,64px)] lg:grid lg:grid-cols-[1.15fr_.85fr] lg:gap-8">
          <div className="relative z-10 order-2 min-w-0 pb-6 pt-2 short:pb-3 short:pt-0 lg:order-1 lg:self-end lg:pb-12 lg:pt-8">
            <div className="mb-5 flex flex-wrap gap-2 short:mb-2 short:gap-1.5" data-slot="fighter-tags">
              <Tag tone="brand">{divisionTitle(fighter.division)}</Tag>
              <Tag tone="outline">{CAREER_STATUS_LABELS[fighter.careerStatus]}</Tag>
              {rankingTags.map((tag) => (
                <Tag key={tag.label} tone={tag.isTitle ? "brand" : "outline"}>
                  {tag.isTitle ? `★ ${tag.label}` : tag.label}
                </Tag>
              ))}
            </div>
            {fighter.nickname ? (
              <p className="sb-spaced text-[clamp(11px,1.4vw,14px)] text-accent-bright">“{fighter.nickname}”</p>
            ) : null}
            {/* Como los afiches: el nombre en un rótulo rojo espaciado y el apellido gigante, cromado. */}
            <h1 id="fighter-name" className="sb-punch-in my-3 uppercase short:my-1">
              <AutoFitText className="sb-label w-fit text-[clamp(12px,1.6vw,17px)]">{fighter.firstName}</AutoFitText>{" "}
              <AutoFitText minFontSize={24} className="sb-chrome-text mt-2 font-display text-[clamp(34px,5.6vw,90px)] leading-[1.02] tracking-[-.02em] short:text-[34px]">{fighter.lastName}</AutoFitText>
            </h1>
            <p data-slot="fighter-record-bar" aria-label={`Récord profesional ${formatRecord(fighter.proRecord)}`} className="mb-4 inline-flex bg-brand-ember px-5 py-1.5 font-display text-[clamp(22px,3vw,34px)] leading-none tracking-[.08em] text-white">
              {formatRecord(fighter.proRecord)}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-cond text-[15px] font-semibold uppercase tracking-[.08em] text-muted-foreground sm:text-base">
              <span className="flex items-center gap-2">
                <Flag code={fighter.nationality} className="h-[18px] w-[27px]" />
                {countryName(fighter.nationality)}
              </span>
              {fighter.weightKg ? <span>{formatWeight(fighter.weightKg)}</span> : null}
            </p>
            {fighter.bio ? (
              <p data-slot="fighter-bio" className="mt-4 line-clamp-3 max-w-xl short:hidden text-[15px] leading-relaxed text-white/85 sm:line-clamp-5 sm:text-base">
                {fighter.bio}
              </p>
            ) : null}
            <CountFigures items={figures} className="mt-5 grid max-w-xl grid-cols-3 border-t border-border short:mt-3" valueClassName="text-[clamp(36px,5vw,64px)] short:text-[30px]" />
          </div>

          {/* La portada ocupa justo la pantalla (100svh): la foto toma el alto que dejan los datos, en celular arriba y en escritorio a la derecha. */}
          <div data-slot="fighter-hero-photo" className="relative order-1 min-h-[180px] w-full flex-1 overflow-hidden lg:order-2 lg:min-h-0 lg:self-stretch">
            <HeroParallax className="absolute inset-0 will-change-transform">
              <FighterFigure
                fighter={fighter}
                sizes={FIGHTER_HERO_SIZES}
                priority
                silhouetteClassName="absolute bottom-0 left-1/2 h-[96%] -translate-x-1/2 text-black drop-shadow-[0_0_3px_rgba(255,59,71,.6)]"
              />
            </HeroParallax>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent lg:hidden" />
          </div>
        </div>
      </section>
      {/* En pantallas bajas la descripción sale de la portada (deja el alto a la foto) y va justo debajo. */}
      {fighter.bio ? (
        <p data-slot="fighter-bio-below" className="mx-auto hidden w-full max-w-[1320px] bg-black px-[clamp(16px,4vw,64px)] pb-6 text-[15px] leading-relaxed text-white/85 short:block">
          {fighter.bio}
        </p>
      ) : null}
    </>
  );
}
