import { SPONSOR_TIER_LABELS, SPONSOR_TIERS, type SponsorTier } from "@/domain/sponsors";
import type { SponsorDTO } from "../dto";
import { SponsorLogo } from "./sponsor-logo";

type SponsorGridProps = {
  sponsors: SponsorDTO[];
  /** Título de la sección (el evento ya tiene su propio `h1`: aquí va un `h2`). */
  title?: string;
};

/** Ancho del logo por nivel: el principal pesa más que el colaborador. */
const LOGO_WIDTH: Record<SponsorTier, { className: string; sizes: string }> = {
  principal: { className: "w-56 sm:w-80", sizes: "(min-width: 640px) 320px, 224px" },
  oficial: { className: "w-40 sm:w-56", sizes: "(min-width: 640px) 224px, 160px" },
  colaborador: { className: "w-28 sm:w-40", sizes: "(min-width: 640px) 160px, 112px" },
};

/** Patrocinadores de un evento: una fila por nivel, de mayor a menor, con el tamaño según el nivel. Sin patrocinadores no dibuja nada. */
export function SponsorGrid({ sponsors, title = "Patrocinadores" }: SponsorGridProps) {
  if (sponsors.length === 0) return null;

  return (
    <section data-slot="event-sponsors" aria-labelledby="event-sponsors-title" className="border-t border-border py-14">
      <h2 id="event-sponsors-title" className="mb-10 text-center font-cond text-sm font-extrabold uppercase tracking-[.24em] text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-10">
        {SPONSOR_TIERS.map((tier) => {
          const inTier = sponsors.filter((sponsor) => sponsor.tier === tier);
          if (inTier.length === 0) return null;
          const { className, sizes } = LOGO_WIDTH[tier];
          return (
            <ul key={tier} aria-label={SPONSOR_TIER_LABELS[tier]} data-tier={tier} className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {inTier.map((sponsor) => (
                <li key={sponsor.id}>
                  <SponsorLogo sponsor={sponsor} sizes={sizes} className={className} />
                </li>
              ))}
            </ul>
          );
        })}
      </div>
    </section>
  );
}
