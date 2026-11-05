import { and, asc, eq, ilike, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { postCategories, postEvents, postFighters, postGallery, posts, type Post } from "@/db/schema/posts";
import { collectBodyMediaIds } from "@/domain/post-body";
import { isPublic } from "@/domain/publication";
import { escapeLike, pageWindow, loadMedia, type PageOptions } from "@/features/fighters/query-helpers";
import type { MediaDTO } from "@/features/media/dto";
import { newestFirst } from "./card-rows";
import type { AdminPostRow, CategoryRow, RelatedItemDTO } from "./dto";

const ADMIN_PAGE_SIZE = 50;

export type AdminPostFilters = { publication?: "draft" | "scheduled" | "published"; category?: string; q?: string };

/** Listado del panel: borradores y programadas incluidos, la papelera no. Más reciente primero, 50 por página. */
export async function listAdminPosts(db: Db, filters: AdminPostFilters, options: PageOptions = {}): Promise<{ items: AdminPostRow[]; hasMore: boolean }> {
  const { limit, offset, size } = pageWindow(options, ADMIN_PAGE_SIZE);
  const text = filters.q?.trim();
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      featured: posts.featured,
      status: posts.status,
      publishAt: posts.publishAt,
      updatedAt: posts.updatedAt,
      coverMediaId: posts.coverMediaId,
      categorySlug: postCategories.slug,
      categoryName: postCategories.name,
    })
    .from(posts)
    .innerJoin(postCategories, eq(postCategories.id, posts.categoryId))
    .where(
      and(
        isNull(posts.deletedAt),
        filters.publication ? eq(posts.status, filters.publication) : undefined,
        filters.category ? eq(postCategories.slug, filters.category) : undefined,
        text ? ilike(posts.title, `%${escapeLike(text)}%`) : undefined,
      ),
    )
    .orderBy(...newestFirst)
    .limit(limit)
    .offset(offset);

  const pageRows = rows.slice(0, size);
  const mediaById = await loadMedia(db, pageRows.map((row) => row.coverMediaId));
  return {
    items: pageRows.map(({ coverMediaId, categorySlug, categoryName, ...row }) => ({
      ...row,
      category: { slug: categorySlug, name: categoryName },
      cover: coverMediaId ? (mediaById.get(coverMediaId) ?? null) : null,
    })),
    hasMore: rows.length > size,
  };
}

export type PostForEdit = {
  post: Post;
  cover: MediaDTO | null;
  /** La galería, en orden. */
  gallery: MediaDTO[];
  /** Imágenes que aparecen dentro del cuerpo (el editor las muestra sin pedirlas una a una). */
  bodyMedia: Record<string, MediaDTO>;
  fighters: RelatedItemDTO[];
  events: RelatedItemDTO[];
};

/** La noticia (fuera de la papelera) con sus imágenes y relaciones, para el formulario. Las relaciones que hoy no se ven en el sitio quedan marcadas. */
export async function getPostForEdit(db: Db, id: string): Promise<PostForEdit | null> {
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
    .limit(1);
  if (!post) return null;

  const [galleryRows, fighterRows, eventRows] = await Promise.all([
    db.select({ mediaId: postGallery.mediaId }).from(postGallery).where(eq(postGallery.postId, id)).orderBy(asc(postGallery.sortOrder)),
    db
      .select({ id: fighters.id, firstName: fighters.firstName, lastName: fighters.lastName, status: fighters.status, publishAt: fighters.publishAt, deletedAt: fighters.deletedAt })
      .from(postFighters)
      .innerJoin(fighters, eq(fighters.id, postFighters.fighterId))
      .where(eq(postFighters.postId, id))
      .orderBy(asc(fighters.lastName), asc(fighters.firstName), asc(fighters.id)),
    db
      .select({ id: events.id, name: events.name, status: events.status, publishAt: events.publishAt, deletedAt: events.deletedAt })
      .from(postEvents)
      .innerJoin(events, eq(events.id, postEvents.eventId))
      .where(eq(postEvents.postId, id))
      .orderBy(asc(events.name), asc(events.id)),
  ]);

  const bodyIds = collectBodyMediaIds(post.body);
  const mediaById = await loadMedia(db, [post.coverMediaId, ...galleryRows.map((row) => row.mediaId), ...bodyIds]);
  const bodyMedia: Record<string, MediaDTO> = {};
  for (const bodyId of bodyIds) {
    const item = mediaById.get(bodyId);
    if (item) bodyMedia[bodyId] = item;
  }
  // Un instante (no un día): se compara con `publish_at`, igual que `publicScope` con `now()` en la base.
  const now = new Date();
  return {
    post,
    cover: post.coverMediaId ? (mediaById.get(post.coverMediaId) ?? null) : null,
    gallery: galleryRows.flatMap((row) => mediaById.get(row.mediaId) ?? []),
    bodyMedia,
    fighters: fighterRows.map((row) => ({ id: row.id, label: `${row.firstName} ${row.lastName}`, isPublic: isPublic(row, now) })),
    events: eventRows.map((row) => ({ id: row.id, label: row.name, isPublic: isPublic(row, now) })),
  };
}

/** Categorías en su orden, con cuántas noticias las usan (también las de la papelera: la base no deja borrar una en uso). */
export async function listCategories(db: Db): Promise<CategoryRow[]> {
  return db
    .select({
      id: postCategories.id,
      slug: postCategories.slug,
      name: postCategories.name,
      sortOrder: postCategories.sortOrder,
      // Un conteo por categoría dentro de la misma consulta (usa el índice de `posts.category_id`): sin N+1.
      postCount: sql<number>`(select count(*)::int from "posts" where "posts"."category_id" = "post_categories"."id")`,
    })
    .from(postCategories)
    .orderBy(asc(postCategories.sortOrder), asc(postCategories.name));
}

/** Boxeadores y eventos relacionados con la noticia, sean públicos o no: sus páginas deben refrescarse cuando la noticia cambia. */
export async function getPostRelationIds(db: Db, postId: string): Promise<{ fighterIds: string[]; eventIds: string[] }> {
  const [fighterRows, eventRows] = await Promise.all([
    db.select({ id: postFighters.fighterId }).from(postFighters).where(eq(postFighters.postId, postId)),
    db.select({ id: postEvents.eventId }).from(postEvents).where(eq(postEvents.postId, postId)),
  ]);
  return { fighterIds: fighterRows.map((row) => row.id), eventIds: eventRows.map((row) => row.id) };
}
