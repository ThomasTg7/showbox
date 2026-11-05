import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { computeRecord } from "@/domain/record";
import { DIVISIONS_CACHE_TAG } from "@/features/divisions/cache";
import { EVENTS_LIST_TAG } from "@/features/events/cache";
import { getFighterFightHistory, getFighterNextBout, listBoutsForRecord } from "@/features/events/fighter-queries";
import { MEDIA_ANY_TAG, mediaCacheTag } from "@/features/media/cache";
import { FIGHTERS_LIST_TAG, fighterCacheTag } from "./cache";
import { getPublicFighterBySlug, getPublicFighterRef, listPublicFighterCardsByIds, listPublicFighters, listPublicFilterOptions } from "./queries";
import type { FighterFilters } from "./schema";

// Lecturas del sitio público, cacheadas con etiquetas para invalidarlas desde la action que escribe.
// El servicio de cada página decide `preview`: la vista previa nunca pasa por aquí.

// Un tope de tiempo cubre lo que ninguna action dispara: boxeadores programados que llegan a su fecha.
const REVALIDATE_SECONDS = 300;

/**
 * Las búsquedas de texto van directo a la base: cada texto (y cada letra que se escribe) sería una entrada de caché
 * de un solo uso. Los filtros de las listas tienen pocas combinaciones y sí se cachean.
 */
export function getCachedPublicFighters(filters: FighterFilters, page: number) {
  if (filters.q) return listPublicFighters(db, filters, { page });
  return unstable_cache(() => listPublicFighters(db, filters, { page }), ["fighters-list", JSON.stringify(filters), String(page)], {
    tags: [FIGHTERS_LIST_TAG, DIVISIONS_CACHE_TAG, MEDIA_ANY_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/** Tarjetas de los boxeadores destacados de la home (por id y en ese orden). Una sola lectura para todos. */
export function getCachedFighterCardsByIds(ids: string[]) {
  return unstable_cache(() => listPublicFighterCardsByIds(db, ids), ["fighter-cards", ...ids], {
    tags: [FIGHTERS_LIST_TAG, DIVISIONS_CACHE_TAG, MEDIA_ANY_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

export function getCachedPublicFilterOptions() {
  return unstable_cache(() => listPublicFilterOptions(db), ["fighters-filter-options"], {
    tags: [FIGHTERS_LIST_TAG, DIVISIONS_CACHE_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/**
 * Ficha pública. Primero una lectura mínima (sin caché) decide si el boxeador es público *ahora*: así un borrador,
 * uno en la papelera o uno programado nunca se sirve desde la caché. Con el id conocido se cachea el resto con
 * las etiquetas del boxeador y de sus imágenes.
 */
export async function getCachedPublicFighter(slug: string) {
  const ref = await getPublicFighterRef(db, slug);
  if (!ref) return null;

  const mediaTags = [ref.bodyMediaId, ref.headshotMediaId].flatMap((id) => (id ? [mediaCacheTag(id)] : []));
  return unstable_cache(() => getPublicFighterBySlug(db, slug), ["fighter-profile", ref.id, slug], {
    // `MEDIA_ANY_TAG`: las fotos de la galería no se conocen antes de leer la ficha (como en los listados).
    tags: [fighterCacheTag(ref.id), DIVISIONS_CACHE_TAG, MEDIA_ANY_TAG, ...mediaTags],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/**
 * Récord en la promotora, historial y próxima pelea del boxeador. Solo cuentan las peleas de eventos públicos ahora, así
 * que despublicar o enviar a la papelera un evento (`EVENTS_LIST_TAG`) cambia el historial. `computeRecord` corre
 * **dentro** de la función cacheada: sus entradas llevan `Date`, que no sobrevive a la serialización JSON de la caché;
 * lo que sale son números y texto (las fechas del historial van como ISO). `FIGHTERS_LIST_TAG`: el historial muestra el nombre
 * y el enlace de cada rival, y renombrar o despublicar a un boxeador invalida esa etiqueta.
 */
export function getCachedFighterBouts(fighterId: string) {
  return unstable_cache(
    async () => {
      const [record, history, nextBout] = await Promise.all([
        listBoutsForRecord(db, fighterId),
        getFighterFightHistory(db, fighterId),
        getFighterNextBout(db, fighterId),
      ]);
      return {
        computed: { pro: computeRecord(record, fighterId, "pro"), amateur: computeRecord(record, fighterId, "amateur") },
        history,
        nextBout,
      };
    },
    ["fighter-bouts", fighterId],
    { tags: [fighterCacheTag(fighterId), FIGHTERS_LIST_TAG, EVENTS_LIST_TAG, DIVISIONS_CACHE_TAG, MEDIA_ANY_TAG], revalidate: REVALIDATE_SECONDS },
  )();
}
