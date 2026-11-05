import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { publicScope } from "@/db/public-scope";
import { bouts, events } from "@/db/schema/events";
import type { BoutLevel } from "@/domain/bout-enums";
import type { EventCardDTO, EventPageDTO } from "@/features/events/dto";
import type { FighterCardDTO } from "@/features/fighters/dto";
import type { PostCardDTO } from "@/features/posts/dto";
import type { RankingCardDTO, RankingsPageDTO } from "@/features/rankings/dto";
import type { SponsorDTO } from "@/features/sponsors/dto";
import type { HomeDTO, HomeEvent, HomeHero, HomeStats } from "./dto";
import { pickHighlights, pickHomeRankingCards } from "./highlights";

/**
 * Las cifras de la banda: solo eventos finalizados y públicos y sus peleas terminadas. Rounds = los disputados en
 * esas peleas (el de la detención cuenta); KO/TKO incluye los RTD. Una consulta (los conteos de SQL son `bigint`: se castean a `int`).
 */
export async function getHomeStats(db: Db): Promise<HomeStats> {
  const [row] = await db
    .select({
      events: sql<number>`count(distinct ${events.id})::int`,
      bouts: sql<number>`count(${bouts.id})::int`,
      rounds: sql<number>`coalesce(sum(${bouts.endRound}), 0)::int`,
      koTko: sql<number>`(count(${bouts.id}) filter (where ${bouts.method} = 'ko_tko'))::int`,
    })
    .from(events)
    .leftJoin(bouts, and(eq(bouts.eventId, events.id), eq(bouts.boutStatus, "completed")))
    .where(and(publicScope(events), eq(events.eventStatus, "completed")));
  return { events: row?.events ?? 0, bouts: row?.bouts ?? 0, rounds: row?.rounds ?? 0, koTko: row?.koTko ?? 0 };
}

/**
 * De dónde lee la home cada pieza. En producción son las lecturas **cacheadas** de cada feature (`cached-queries.ts`: cada una
 * ya trae sus etiquetas); los tests pasan lecturas sobre una base de prueba, que no tiene la caché de Next.
 */
export type HomeSources = {
  nextEvent: () => Promise<EventCardDTO | null>;
  /** La primera página de eventos pasados (el último con resultados sale de aquí). */
  pastEvents: () => Promise<EventCardDTO[]>;
  eventPage: (slug: string) => Promise<EventPageDTO | null>;
  rankLabels: (eventId: string, boutIds: string[]) => Promise<Record<string, string>>;
  news: () => Promise<{ main: PostCardDTO | null; top: PostCardDTO[] }>;
  dontMiss: () => Promise<PostCardDTO[]>;
  rankings: (level: BoutLevel) => Promise<RankingsPageDTO>;
  fighterCards: (ids: string[]) => Promise<FighterCardDTO[]>;
  /** La primera página del listado público: sirve de respaldo cuando el ranking no trae boxeadores. */
  publicFighters: () => Promise<FighterCardDTO[]>;
  stats: () => Promise<HomeStats>;
  sponsors: () => Promise<SponsorDTO[]>;
};

/** Cuántos boxeadores muestra el respaldo cuando el ranking pro no da ninguno (oculto o sin armar). */
const FALLBACK_FIGHTERS = 8;

async function loadEvent(sources: HomeSources, card: EventCardDTO): Promise<HomeEvent | null> {
  const event = await sources.eventPage(card.slug);
  if (!event) return null;
  const boutIds = event.segments.flatMap((segment) => segment.bouts.map((bout) => bout.id));
  return { event, rankLabels: boutIds.length > 0 ? await sources.rankLabels(event.id, boutIds) : {} };
}

/** El próximo evento; sin él, el último finalizado (con sus resultados); sin ninguno, el bloque de marca. */
async function resolveHero(sources: HomeSources, next: EventCardDTO | null, past: EventCardDTO[]): Promise<HomeHero> {
  if (next) {
    const loaded = await loadEvent(sources, next);
    if (loaded) return { kind: "next-event", ...loaded };
  }
  const last = past.find((event) => event.eventStatus === "completed");
  const loaded = last ? await loadEvent(sources, last) : null;
  return loaded ? { kind: "last-event", ...loaded } : { kind: "brand" };
}

async function resolveFighters(sources: HomeSources, proCards: RankingCardDTO[]): Promise<HomeDTO["fighters"]> {
  const highlights = pickHighlights(proCards);
  if (highlights.length === 0) return (await sources.publicFighters()).slice(0, FALLBACK_FIGHTERS).map((fighter) => ({ fighter, badge: null, backdrop: null }));

  const cards = new Map((await sources.fighterCards(highlights.map((item) => item.id))).map((card) => [card.id, card]));
  // Quien ya no es público no sale en `fighterCards`: se omite sin dejar un hueco.
  return highlights.flatMap(({ id, badge, backdrop }) => {
    const fighter = cards.get(id);
    return fighter ? [{ fighter, badge, backdrop }] : [];
  });
}

/**
 * Arma lo que dibuja la home con **una** ronda de lecturas en paralelo (más la del evento de la portada y la de los
 * destacados, que dependen de ellas). No lee la base por su cuenta ni agrega otra caché: cada pieza ya viene de la lectura
 * cacheada de su feature, con sus etiquetas.
 */
export async function buildHomeData(sources: HomeSources): Promise<HomeDTO> {
  const [next, past, news, dontMiss, pro, amateur, stats, sponsors] = await Promise.all([
    sources.nextEvent(),
    sources.pastEvents(),
    sources.news(),
    sources.dontMiss(),
    sources.rankings("pro"),
    sources.rankings("amateur"),
    sources.stats(),
    sources.sponsors(),
  ]);
  const [hero, fighters] = await Promise.all([resolveHero(sources, next, past), resolveFighters(sources, pro.cards)]);

  return {
    hero,
    news,
    dontMiss,
    fighters,
    stats,
    rankings: { pro: pickHomeRankingCards(pro.cards), amateur: pickHomeRankingCards(amateur.cards) },
    sponsors,
  };
}
