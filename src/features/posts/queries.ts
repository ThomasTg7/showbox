import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { publicScope } from "@/db/public-scope";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { postCategories, postEvents, postFighters, postGallery, posts } from "@/db/schema/posts";
import { collectBodyMediaIds } from "@/domain/post-body";
import { fighterPhotoIds, fighterPhotos } from "@/features/fighters/query-helpers";
import type { MediaDTO } from "@/features/media/dto";
import { getMediaByIds } from "@/features/media/queries";
import { selectCardRows, toCardDTO, toCardDTOs } from "./card-rows";
import type { PostCardDTO, PostCategoryDTO, PostDTO } from "./dto";

const PUBLIC_PAGE_SIZE = 12;
const HOME_TOP_SIZE = 5;
const RELATED_LIMIT = 6;

type PreviewOptions = { preview?: boolean };

/**
 * Lectura mínima (una fila por índice único) para saber si la noticia es pública *ahora* y cuál es su portada (su
 * etiqueta de caché). Va antes de la lectura cacheada: un borrador, una en la papelera o una programada que aún no
 * llega nunca se sirve desde la caché.
 */
export async function getPublicPostRef(db: Db, slug: string): Promise<{ id: string; coverMediaId: string | null } | null> {
  const [row] = await db
    .select({ id: posts.id, coverMediaId: posts.coverMediaId })
    .from(posts)
    .where(and(eq(posts.slug, slug), publicScope(posts)))
    .limit(1);
  return row ?? null;
}

/** Listado público paginado de 12 (convención `pageSize + 1`), con filtro por categoría (slug). */
export async function listPublicPosts(
  db: Db,
  filters: { category?: string },
  { page = 1, pageSize = PUBLIC_PAGE_SIZE }: { page?: number; pageSize?: number } = {},
): Promise<{ items: PostCardDTO[]; hasMore: boolean }> {
  const where = and(publicScope(posts), filters.category ? eq(postCategories.slug, filters.category) : undefined);
  const rows = await selectCardRows(db, where, { limit: pageSize + 1, offset: (Math.max(page, 1) - 1) * pageSize });
  const [items] = await toCardDTOs(db, rows.slice(0, pageSize));
  return { items: items ?? [], hasMore: rows.length > pageSize };
}

/** Categorías que hoy tienen al menos una noticia visible, en el orden del catálogo (los filtros de `/noticias`). */
export async function listPublicPostCategories(db: Db): Promise<PostCategoryDTO[]> {
  const visible = db.select({ categoryId: posts.categoryId }).from(posts).where(publicScope(posts));
  return db
    .select({ id: postCategories.id, slug: postCategories.slug, name: postCategories.name })
    .from(postCategories)
    .where(inArray(postCategories.id, visible))
    .orderBy(asc(postCategories.sortOrder), asc(postCategories.name));
}

/**
 * Home (spec §3): la noticia «Destacada» más reciente es la principal y «Top Noticias» son las 5 publicadas más
 * recientes sin ella. Sin ninguna destacada, la principal es la más reciente (la home nunca queda sin noticia grande
 * mientras haya alguna publicada).
 */
export async function getHomeNews(db: Db): Promise<{ main: PostCardDTO | null; top: PostCardDTO[] }> {
  const [featuredRows, latest] = await Promise.all([
    selectCardRows(db, and(publicScope(posts), eq(posts.featured, true)), { limit: 1 }),
    // Una más que el tope: si la principal está entre las más recientes, se descarta y aún quedan 5.
    selectCardRows(db, publicScope(posts), { limit: HOME_TOP_SIZE + 1 }),
  ]);
  const mainRow = featuredRows[0] ?? latest[0];
  const topRows = latest.filter((row) => row.id !== mainRow?.id).slice(0, HOME_TOP_SIZE);
  const [main, top] = await toCardDTOs(db, mainRow ? [mainRow] : [], topRows);
  return { main: main?.[0] ?? null, top: top ?? [] };
}

/**
 * «No te lo pierdas» de la home: las últimas noticias públicas con video, publicación de una red o galería. Lo decide
 * la columna `has_media` (calculada al guardar), así no se lee el JSON del cuerpo de cada noticia. Las portadas, en una sola lectura.
 */
export async function listDontMissPosts(db: Db, limit: number): Promise<PostCardDTO[]> {
  const rows = await selectCardRows(db, and(publicScope(posts), eq(posts.hasMedia, true)), { limit });
  return (await toCardDTOs(db, rows))[0] ?? [];
}

/** Noticias públicas donde aparece un boxeador, la más reciente primero (carrusel de la ficha). */
export async function listPostsForFighter(db: Db, fighterId: string, limit = RELATED_LIMIT): Promise<PostCardDTO[]> {
  const related = db.select({ postId: postFighters.postId }).from(postFighters).where(eq(postFighters.fighterId, fighterId));
  const rows = await selectCardRows(db, and(publicScope(posts), inArray(posts.id, related)), { limit });
  return (await toCardDTOs(db, rows))[0] ?? [];
}

/** Noticias públicas donde aparece un evento, la más reciente primero (carrusel de la página del evento). */
export async function listPostsForEvent(db: Db, eventId: string, limit = RELATED_LIMIT): Promise<PostCardDTO[]> {
  const related = db.select({ postId: postEvents.postId }).from(postEvents).where(eq(postEvents.eventId, eventId));
  const rows = await selectCardRows(db, and(publicScope(posts), inArray(posts.id, related)), { limit });
  return (await toCardDTOs(db, rows))[0] ?? [];
}

/**
 * Noticia pública con su galería, las imágenes del cuerpo y los boxeadores y eventos relacionados que hoy se ven en el
 * sitio. Todas las imágenes salen de una sola lectura de medios. Con `preview`, incluye borradores y programadas.
 */
export async function getPublicPostBySlug(db: Db, slug: string, { preview = false }: PreviewOptions = {}): Promise<PostDTO | null> {
  const [row] = await db
    .select()
    .from(posts)
    .innerJoin(postCategories, eq(postCategories.id, posts.categoryId))
    .where(and(eq(posts.slug, slug), preview ? isNull(posts.deletedAt) : publicScope(posts)))
    .limit(1);
  if (!row) return null;
  const post = row.posts;

  const [galleryRows, fighterRows, eventRows] = await Promise.all([
    db.select({ mediaId: postGallery.mediaId }).from(postGallery).where(eq(postGallery.postId, post.id)).orderBy(asc(postGallery.sortOrder)),
    db
      .select({
        id: fighters.id,
        slug: fighters.slug,
        firstName: fighters.firstName,
        lastName: fighters.lastName,
        nickname: fighters.nickname,
        nationality: fighters.nationality,
        headshotMediaId: fighters.headshotMediaId,
        bodyMediaId: fighters.bodyMediaId,
      })
      .from(postFighters)
      .innerJoin(fighters, eq(fighters.id, postFighters.fighterId))
      .where(and(eq(postFighters.postId, post.id), publicScope(fighters)))
      .orderBy(asc(fighters.lastName), asc(fighters.firstName), asc(fighters.id)),
    db
      .select({ id: events.id, slug: events.slug, name: events.name, startsAt: events.startsAt })
      .from(postEvents)
      .innerJoin(events, eq(events.id, postEvents.eventId))
      .where(and(eq(postEvents.postId, post.id), publicScope(events)))
      .orderBy(desc(events.startsAt), asc(events.id)),
  ]);

  const bodyMediaIds = collectBodyMediaIds(post.body);
  const mediaIds = [
    post.coverMediaId,
    ...galleryRows.map((item) => item.mediaId),
    ...bodyMediaIds,
    ...fighterPhotoIds(fighterRows),
  ].filter((id): id is string => id !== null);
  const mediaById = await getMediaByIds(db, [...new Set(mediaIds)]);

  const bodyMedia: Record<string, MediaDTO> = {};
  for (const id of bodyMediaIds) {
    const item = mediaById.get(id);
    if (item) bodyMedia[id] = item;
  }

  return {
    ...toCardDTO({ ...post, categorySlug: row.post_categories.slug, categoryName: row.post_categories.name }, mediaById),
    updatedAt: post.updatedAt.toISOString(),
    body: post.body,
    gallery: galleryRows.flatMap((item) => mediaById.get(item.mediaId) ?? []),
    bodyMedia,
    fighters: fighterRows.map(({ headshotMediaId, bodyMediaId, ...fighter }) => ({ ...fighter, ...fighterPhotos(mediaById, { headshotMediaId, bodyMediaId }) })),
    events: eventRows.map((event) => ({ ...event, startsAt: event.startsAt.toISOString() })),
  };
}

/** Slug de una noticia fuera de la papelera (enlace de vista previa). */
export async function getPostSlug(db: Db, id: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
    .limit(1);
  return row?.slug ?? null;
}
