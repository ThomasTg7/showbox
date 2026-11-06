import Link from "next/link";
import { SectionHeading } from "@/components/ui-gc/section-heading";
import { FighterCard } from "@/features/fighters/components/fighter-card";
import type { HomeFighterHighlight } from "../dto";
import { PinnedTrack } from "./pinned-track";

export const FIGHTERS_SECTION_ID = "boxeadores";

/**
 * «Boxeadores» (maqueta): los campeones y los primeros de cada división, con su etiqueta y el número que muestra `/rankings`,
 * y una tarjeta final «Todo el plantel». En escritorio la sección se fija y la pista avanza con el scroll; en celular es un
 * carrusel con imán. Sin boxeadores no se dibuja.
 *
 * El `<div>` de afuera es obligatorio: al fijar, GSAP mete la `<section>` dentro de un `.pin-spacer` nuevo. Si la sección
 * fuera hija directa de `<main>`, al navegar fuera de la home React haría `main.removeChild(section)` antes de que el efecto
 * deshaga el pin, y la página siguiente caería en «This page couldn't load». Con el envoltorio React solo quita el `<div>`.
 */
export function FightersPin({ fighters }: { fighters: HomeFighterHighlight[] }) {
  if (fighters.length === 0) return null;

  return (
    <div>
      <section id={FIGHTERS_SECTION_ID} aria-labelledby="home-fighters-title" className="overflow-hidden">
        <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] pt-[clamp(72px,9vh,120px)]">
          <SectionHeading
            reveal
            className="mb-7"
            kicker="El plantel"
            title="Boxeadores"
            titleId="home-fighters-title"
            action={
              <Link href="/boxeadores" className="inline-flex min-h-11 items-center gap-4 border-b-2 border-brand pb-1 font-cond text-sm font-extrabold uppercase tracking-[.1em] text-white">
                Ver todos <span aria-hidden>→</span>
              </Link>
            }
          />
        </div>
        <PinnedTrack sectionId={FIGHTERS_SECTION_ID} label="Boxeadores destacados">
          {fighters.map(({ fighter, badge, backdrop }) => (
            <li key={fighter.id} className="w-[min(78vw,300px)] shrink-0 snap-start md:w-[340px]">
              <FighterCard fighter={fighter} heading="h3" badge={badge ?? undefined} backdrop={backdrop ?? undefined} />
            </li>
          ))}
          <li className="w-[min(78vw,300px)] shrink-0 snap-start md:w-[340px]">
            <Link href="/boxeadores" className="grid h-full min-h-[300px] place-items-center bg-brand p-6 text-center text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <span>
                <span className="block font-display text-[clamp(32px,7vw,54px)] uppercase leading-[.9]">
                  Todo el
                  <br />
                  plantel
                </span>
                <span className="mt-3.5 block font-cond text-base font-bold uppercase tracking-[.06em]">Ver boxeadores →</span>
              </span>
            </Link>
          </li>
        </PinnedTrack>
      </section>
    </div>
  );
}
