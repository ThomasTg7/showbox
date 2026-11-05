import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { DIVISIONS_CACHE_TAG } from "@/features/divisions/cache";
import { FIGHTERS_LIST_TAG } from "@/features/fighters/cache";
import { MEDIA_ANY_TAG, mediaCacheTag } from "@/features/media/cache";
import { EVENTS_LIST_TAG, eventCacheTag } from "./cache";
import { getNextEvent, getPublicEventBySlug, getPublicEventRef, listPublicEvents } from "./queries";

// Lecturas del sitio público, cacheadas con etiquetas para invalidarlas desde la action que escribe.
// La vista previa nunca pasa por aquí: la página lee el borrador directo de la base.

// Un tope de tiempo cubre lo que ninguna action dispara: eventos programados que llegan a su hora de publicación y el
// paso de «próximo» a «pasado».
const REVALIDATE_SECONDS = 300;

// Un evento en vivo se cachea por muy poco: si una petición ya en curso termina *después* de que una action expiró la
// etiqueta, escribe en la caché los datos de antes de guardar el resultado; con 300 s la página en vivo quedaría vieja
// minutos aunque la persona que la mira se refresque cada 20 s. Con 10 s el desfase máximo es ese más el refresco.
const LIVE_REVALIDATE_SECONDS = 10;

// Las tarjetas y la cartelera muestran nombre, foto, bandera y récord de los boxeadores: una edición de boxeador
// (`fighters`) o de imagen (`media`) las refresca.
const LIST_TAGS = [EVENTS_LIST_TAG, FIGHTERS_LIST_TAG, DIVISIONS_CACHE_TAG, MEDIA_ANY_TAG];

export function getCachedPublicEvents(when: "upcoming" | "past", page: number) {
  return unstable_cache(() => listPublicEvents(db, { when }, { page }), ["events-list", when, String(page)], {
    tags: LIST_TAGS,
    revalidate: REVALIDATE_SECONDS,
  })();
}

export function getCachedNextEvent() {
  return unstable_cache(() => getNextEvent(db), ["events-next"], { tags: LIST_TAGS, revalidate: REVALIDATE_SECONDS })();
}

/**
 * Página del evento. Primero una lectura mínima (sin caché) decide si el evento es público *ahora*: así un borrador,
 * uno en la papelera o uno programado nunca se sirve desde la caché. Con el id conocido se cachea el resto con las
 * etiquetas del evento, de sus imágenes y de los boxeadores de la cartelera. Al guardar un resultado la action expira
 * `event:<id>` y la página en vivo lo muestra en el siguiente refresco.
 */
export async function getCachedPublicEvent(slug: string) {
  const ref = await getPublicEventRef(db, slug);
  if (!ref) return null;

  const mediaTags = [ref.heroMediaId, ref.heroMobileMediaId, ref.posterMediaId].flatMap((id) => (id ? [mediaCacheTag(id)] : []));
  return unstable_cache(() => getPublicEventBySlug(db, slug), ["event-page", ref.id, slug], {
    tags: [eventCacheTag(ref.id), FIGHTERS_LIST_TAG, DIVISIONS_CACHE_TAG, MEDIA_ANY_TAG, ...mediaTags],
    revalidate: ref.eventStatus === "live" ? LIVE_REVALIDATE_SECONDS : REVALIDATE_SECONDS,
  })();
}
