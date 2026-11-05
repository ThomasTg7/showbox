import type { EventPageDTO } from "@/features/events/dto";
import type { FighterCardDTO } from "@/features/fighters/dto";
import type { PostCardDTO } from "@/features/posts/dto";
import type { RankingCardDTO } from "@/features/rankings/dto";
import type { SponsorDTO } from "@/features/sponsors/dto";

// Todo lo que pasa por la caché se serializa en JSON: las fechas viajan como texto ISO.

export type HomeStats = { events: number; bouts: number; finishes: number; koTko: number };

/** El evento que protagoniza la portada y la cartelera resumida, con el número de ranking de cada boxeador de la cartelera. */
export type HomeEvent = { event: EventPageDTO; rankLabels: Record<string, string> };

/**
 * La portada: el próximo evento; si no hay, el último evento terminado (con sus resultados); si tampoco hay, un bloque de
 * marca «Próximamente». La home nunca se rompe sin evento.
 */
export type HomeHero = ({ kind: "next-event" } & HomeEvent) | ({ kind: "last-event" } & HomeEvent) | { kind: "brand" };

/** Un boxeador destacado: su tarjeta y, si está en el ranking, la etiqueta («Campeón», «#3») y el número grande de fondo. */
export type HomeFighterHighlight = { fighter: FighterCardDTO; badge: string | null; backdrop: string | null };

export type HomeDTO = {
  hero: HomeHero;
  news: { main: PostCardDTO | null; top: PostCardDTO[] };
  dontMiss: PostCardDTO[];
  fighters: HomeFighterHighlight[];
  stats: HomeStats;
  /** Hasta 3 tarjetas por nivel (el libra por libra y las primeras divisiones con campeón); `[]` si el nivel está oculto. */
  rankings: { pro: RankingCardDTO[]; amateur: RankingCardDTO[] };
  sponsors: SponsorDTO[];
};
