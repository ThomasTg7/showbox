import { championWord } from "@/domain/rankings";
import type { RankingCardDTO } from "@/features/rankings/dto";

export const MAX_HIGHLIGHTS = 8;
/** Cuántas tarjetas de ranking muestra la home por nivel (el libra por libra y dos divisiones). */
export const HOME_RANKING_CARDS = 3;
const PER_DIVISION = 3;

export type Highlight = { id: string; badge: string; backdrop: string };

/**
 * Los boxeadores destacados de la home salen de las tarjetas pro: de cada división, el campeón y los tres primeros del
 * ranking, sin repetir y hasta 8. El número es el que ya muestra `/rankings` (las tarjetas traen el puesto compactado): no
 * se recalcula. El libra por libra no aporta: sus puestos no son de división.
 */
export function pickHighlights(cards: RankingCardDTO[]): Highlight[] {
  const seen = new Set<string>();
  const picked: Highlight[] = [];
  const add = (id: string, badge: string, backdrop: string) => {
    if (picked.length >= MAX_HIGHLIGHTS || seen.has(id)) return;
    seen.add(id);
    picked.push({ id, badge, backdrop });
  };

  for (const card of cards) {
    if (!card.division) continue;
    if (card.champion) add(card.champion.id, championWord(card.division.gender), "C");
    for (const entry of card.entries.slice(0, PER_DIVISION)) add(entry.fighter.id, `#${entry.position}`, String(entry.position));
  }
  return picked;
}

/**
 * Las tarjetas de ranking de la home (maqueta): el libra por libra y las primeras divisiones **con campeón**, en el orden de
 * `/rankings`; si no hay suficientes con campeón, completan las que solo tienen puestos.
 */
export function pickHomeRankingCards(cards: RankingCardDTO[]): RankingCardDTO[] {
  const poundForPound = cards.filter((card) => !card.division);
  const divisions = cards.filter((card) => card.division);
  const room = Math.max(0, HOME_RANKING_CARDS - Math.min(poundForPound.length, 1));
  const withChampion = divisions.filter((card) => card.champion).slice(0, room);
  const filler = divisions.filter((card) => !card.champion).slice(0, room - withChampion.length);
  const chosen = new Set([...withChampion, ...filler]);
  return [...poundForPound.slice(0, 1), ...divisions.filter((card) => chosen.has(card))];
}
