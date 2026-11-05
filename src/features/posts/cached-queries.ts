import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { EVENTS_LIST_TAG, eventCacheTag } from "@/features/events/cache";
import { FIGHTERS_LIST_TAG, fighterCacheTag } from "@/features/fighters/cache";
import { MEDIA_ANY_TAG, mediaCacheTag } from "@/features/media/cache";
import { POSTS_LIST_TAG, postCacheTag } from "./cache";
import { getHomeNews, getPublicPostBySlug, getPublicPostRef, listDontMissPosts, listPostsForEvent, listPostsForFighter, listPublicPostCategories, listPublicPosts } from "./queries";

// Lecturas del sitio público, cacheadas con etiquetas para invalidarlas desde la action que escribe.
// La vista previa nunca pasa por aquí: la página lee el borrador directo de la base.

// Un tope de tiempo cubre lo que ninguna action dispara: noticias programadas que llegan a su hora de publicación
// (la ficha se ve al instante por la lectura mínima; listados y home, con hasta este retraso).
const REVALIDATE_SECONDS = 300;

const DONT_MISS_SIZE = 8;

/** Más allá de esta página no se cachea: cada `?pagina=` inventado sería una entrada de un solo uso. */
const MAX_CACHED_PAGE = 20;

/** Listado público por categoría (slug) y página. Pocas combinaciones: se cachea (las primeras páginas). */
export function getCachedPublicPosts(category: string | undefined, page: number) {
  if (page > MAX_CACHED_PAGE) return listPublicPosts(db, { category }, { page });
  return unstable_cache(() => listPublicPosts(db, { category }, { page }), ["posts-list", category ?? "", String(page)], {
    tags: [POSTS_LIST_TAG, MEDIA_ANY_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/**
 * Noticias de la ficha de un boxeador. Lleva `fighter:<id>` (las actions de noticias lo expiran antes y después de cambiar
 * una relación), la lista de noticias (títulos y categorías) y las imágenes (portadas).
 */
export function getCachedPostsForFighter(fighterId: string) {
  return unstable_cache(() => listPostsForFighter(db, fighterId), ["posts-for-fighter", fighterId], {
    tags: [fighterCacheTag(fighterId), POSTS_LIST_TAG, MEDIA_ANY_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/** Noticias de la página de un evento; igual que la del boxeador, con `event:<id>`. */
export function getCachedPostsForEvent(eventId: string) {
  return unstable_cache(() => listPostsForEvent(db, eventId), ["posts-for-event", eventId], {
    tags: [eventCacheTag(eventId), POSTS_LIST_TAG, MEDIA_ANY_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}

/** Filtros de categoría de `/noticias`. */
export function getCachedPublicPostCategories() {
  return unstable_cache(() => listPublicPostCategories(db), ["posts-categories"], { tags: [POSTS_LIST_TAG], revalidate: REVALIDATE_SECONDS })();
}

export function getCachedHomeNews() {
  return unstable_cache(() => getHomeNews(db), ["posts-home"], { tags: [POSTS_LIST_TAG, MEDIA_ANY_TAG], revalidate: REVALIDATE_SECONDS })();
}

/** «No te lo pierdas» de la home: las 8 últimas noticias con video, publicación de una red o galería. */
export function getCachedDontMissPosts() {
  return unstable_cache(() => listDontMissPosts(db, DONT_MISS_SIZE), ["posts-dont-miss"], { tags: [POSTS_LIST_TAG, MEDIA_ANY_TAG], revalidate: REVALIDATE_SECONDS })();
}

/**
 * Página de la noticia. Primero una lectura mínima (sin caché) decide si es pública *ahora*: así un borrador, una en la
 * papelera o una programada que aún no llega nunca se sirve desde la caché. Con el id conocido se cachea el resto con las
 * etiquetas de la noticia, de su portada y de sus boxeadores y eventos. La galería y las imágenes del cuerpo no se
 * conocen antes de leerla: llevan `MEDIA_ANY_TAG` (como la galería de la ficha del boxeador).
 */
export async function getCachedPublicPost(slug: string) {
  const ref = await getPublicPostRef(db, slug);
  if (!ref) return null;

  const coverTags = ref.coverMediaId ? [mediaCacheTag(ref.coverMediaId)] : [];
  return unstable_cache(() => getPublicPostBySlug(db, slug), ["post-page", ref.id, slug], {
    tags: [postCacheTag(ref.id), POSTS_LIST_TAG, FIGHTERS_LIST_TAG, EVENTS_LIST_TAG, MEDIA_ANY_TAG, ...coverTags],
    revalidate: REVALIDATE_SECONDS,
  })();
}
