import { formatDate } from "@/lib/format-date";
import { RankingCard } from "@/features/rankings/components/ranking-card";
import type { RankingCardDTO } from "@/features/rankings/dto";
import { RankingSwitch } from "./ranking-switch";

/** Tarjetas de un nivel, o `null` si no tiene (nivel oculto o sin rankings armados). */
function panel(cards: RankingCardDTO[]) {
  if (cards.length === 0) return null;
  return cards.map((card) => <RankingCard key={card.division?.id ?? "p4p"} {...card} />);
}

/** «Actualizado 20 sep 2026»: la versión más reciente entre las tarjetas mostradas, o «Rankings oficiales» sin versión. */
function kicker(cards: RankingCardDTO[]): string {
  const latest = cards.flatMap((card) => (card.updatedAt ? [card.updatedAt] : [])).sort().at(-1);
  return latest ? `Actualizado ${formatDate(new Date(latest))}` : "Rankings oficiales";
}

/**
 * Rankings resumidos de la home: tres tarjetas por nivel (libra por libra y las primeras divisiones con campeón), las mismas
 * `RankingCard` de `/rankings` con los puestos que ya traen compactados. Los dos niveles se leen en el servidor y el selector
 * solo alterna cuál se ve. Si un nivel no tiene tarjetas no hay pestaña; sin ninguno, la sección no se dibuja.
 */
export function RankingsPreview({ rankings }: { rankings: { pro: RankingCardDTO[]; amateur: RankingCardDTO[] } }) {
  if (rankings.pro.length === 0 && rankings.amateur.length === 0) return null;

  return (
    <section id="rankings" aria-labelledby="home-rankings-title" className="py-[clamp(72px,10vw,140px)]">
      <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)]">
        <RankingSwitch
          panels={{ pro: panel(rankings.pro), amateur: panel(rankings.amateur) }}
          kickers={{ pro: kicker(rankings.pro), amateur: kicker(rankings.amateur) }}
        />
      </div>
    </section>
  );
}
