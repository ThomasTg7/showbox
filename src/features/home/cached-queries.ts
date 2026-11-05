import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { EVENTS_LIST_TAG } from "@/features/events/cache";
import { getCachedNextEvent, getCachedPublicEvent, getCachedPublicEvents } from "@/features/events/cached-queries";
import { getCachedFighterCardsByIds, getCachedPublicFighters } from "@/features/fighters/cached-queries";
import { getCachedDontMissPosts, getCachedHomeNews } from "@/features/posts/cached-queries";
import { getCachedBoutRankLabels, getCachedPublicRankings } from "@/features/rankings/cached-queries";
import { getCachedSponsors } from "@/features/sponsors/cached-queries";
import type { HomeStats } from "./dto";
import { buildHomeData, getHomeStats, type HomeSources } from "./queries";

// Lecturas del sitio público cacheadas con etiquetas. La home no agrega otra caché por encima: cada pieza ya viene de la
// lectura cacheada de su feature (con sus etiquetas: eventos, noticias, boxeadores, rankings, patrocinadores, imágenes).

const REVALIDATE_SECONDS = 300;

/** Las cifras de la banda: cambian al guardar un resultado o finalizar un evento (`events`). */
function getCachedHomeStats(): Promise<HomeStats> {
  return unstable_cache(() => getHomeStats(db), ["home-stats"], { tags: [EVENTS_LIST_TAG], revalidate: REVALIDATE_SECONDS })();
}

const cachedSources: HomeSources = {
  nextEvent: getCachedNextEvent,
  pastEvents: async () => (await getCachedPublicEvents("past", 1)).items,
  eventPage: getCachedPublicEvent,
  rankLabels: getCachedBoutRankLabels,
  news: getCachedHomeNews,
  dontMiss: getCachedDontMissPosts,
  rankings: getCachedPublicRankings,
  fighterCards: getCachedFighterCardsByIds,
  publicFighters: async () => (await getCachedPublicFighters({}, 1)).items,
  stats: getCachedHomeStats,
  sponsors: () => getCachedSponsors("home"),
};

/** Todo lo que dibuja la home, de las lecturas cacheadas de cada feature. La home no lee `searchParams`: queda estática. */
export function getHomeData() {
  return buildHomeData(cachedSources);
}
