import type { SponsorDTO } from "../dto";
import { SponsorLogo } from "./sponsor-logo";

type SponsorStripProps = {
  sponsors: SponsorDTO[];
  label?: string;
};

/** Cuántos logos lleva cada mitad de la pista como mínimo: con pocos patrocinadores se repiten para que la cinta no quede vacía. */
const MIN_LOGOS_PER_HALF = 6;

function Half({ sponsors, repeats, decorative }: { sponsors: SponsorDTO[]; repeats: number; decorative: boolean }) {
  return (
    <ul className={`flex shrink-0 items-center ${decorative ? "motion-reduce:hidden" : ""}`} aria-hidden={decorative || undefined}>
      {Array.from({ length: repeats }, (_, round) =>
        sponsors.map((sponsor) => (
          // Las vueltas repetidas solo rellenan la cinta: con «reducir movimiento» (fila quieta) cada logo sale una vez.
          <li key={`${round}-${sponsor.id}`} className={`px-6 sm:px-12 ${round > 0 ? "motion-reduce:hidden" : ""}`}>
            <SponsorLogo sponsor={sponsor} sizes="160px" className="w-32 sm:w-40" muted decorative={decorative || round > 0} />
          </li>
        )),
      )}
    </ul>
  );
}

/**
 * Cinta continua de logos (la de la maqueta): se detiene al pasar el mouse y sus logos pasan de gris a color. Con
 * «reducir movimiento» no se anima: los logos quedan en una fila que se envuelve. Sin patrocinadores no dibuja nada.
 */
export function SponsorStrip({ sponsors, label = "Patrocinadores oficiales" }: SponsorStripProps) {
  if (sponsors.length === 0) return null;
  const repeats = Math.max(1, Math.ceil(MIN_LOGOS_PER_HALF / sponsors.length));

  return (
    <section aria-label="Patrocinadores" className="group overflow-hidden border-y border-border py-9">
      <p className="mb-6 text-center font-cond text-xs font-extrabold uppercase tracking-[.24em] text-muted-foreground">{label}</p>
      <div className="flex w-max animate-[marquee_40s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center">
        <Half sponsors={sponsors} repeats={repeats} decorative={false} />
        <Half sponsors={sponsors} repeats={repeats} decorative />
      </div>
    </section>
  );
}
