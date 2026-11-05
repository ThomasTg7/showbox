import { unstable_cache } from "next/cache";
import { db } from "@/db";
import type { BoutLevel } from "@/domain/bout-enums";
import { DIVISIONS_CACHE_TAG } from "@/features/divisions/cache";
import { eventCacheTag } from "@/features/events/cache";
import { FIGHTERS_LIST_TAG, fighterCacheTag } from "@/features/fighters/cache";
import { MEDIA_ANY_TAG } from "@/features/media/cache";
import { RANKINGS_TAG } from "./cache";
import { getChampionBadges } from "./champion-badges";
import { getBoutRankLabels, getFighterRankingTags, getPublicRankings } from "./queries";

// Lecturas del sitio público cacheadas con etiquetas. Las fechas van como ISO (la caché serializa en JSON).

// Tope de tiempo: cubre lo que ninguna action dispara (un boxeador programado que llega a su fecha de publicación).
const REVALIDATE_SECONDS = 300;

/** `/rankings` de un nivel: los nombres y las fotos de los boxeadores y los nombres de las divisiones también lo invalidan. */
export function getCachedPublicRankings(level: BoutLevel) {
  return unstable_cache(() => getPublicRankings(db, level), ["rankings-page", level], {
    tags: [RANKINGS_TAG, DIVISIONS_CACHE_TAG, FIGHTERS_LIST_TAG, MEDIA_ANY_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/**
 * Etiquetas de campeón y ranking de la ficha. Van aparte de la caché de la ficha (`fighter:<id>` y `rankings`) para que
 * guardar un ranking no obligue a releer toda la ficha ni al revés.
 */
export function getCachedFighterRankingTags(fighterId: string) {
  return unstable_cache(() => getFighterRankingTags(db, fighterId), ["fighter-ranking-tags", fighterId], {
    tags: [RANKINGS_TAG, fighterCacheTag(fighterId), DIVISIONS_CACHE_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/**
 * `C` o `#n` de cada boxeador de la cartelera (por id) según el ranking de hoy. Va aparte de la caché del evento: guardar un
 * ranking solo expira `rankings`, y cambiar la cartelera expira `event:<id>`. Devuelve un objeto (la caché serializa en JSON).
 */
export function getCachedBoutRankLabels(eventId: string, boutIds: string[]): Promise<Record<string, string>> {
  return unstable_cache(async () => Object.fromEntries(await getBoutRankLabels(db, boutIds)), ["bout-rank-labels", eventId, ...boutIds], {
    tags: [RANKINGS_TAG, eventCacheTag(eventId), FIGHTERS_LIST_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/** «Campeón»/«Campeona» por id de boxeador para las tarjetas de `/boxeadores` (y la home). */
export function getCachedChampionBadges(): Promise<Record<string, string>> {
  return unstable_cache(() => getChampionBadges(db), ["champion-badges"], {
    tags: [RANKINGS_TAG, DIVISIONS_CACHE_TAG, FIGHTERS_LIST_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}
