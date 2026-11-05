import { desc, eq, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { postCategories, posts } from "@/db/schema/posts";
import type { MediaDTO } from "@/features/media/dto";
import { getMediaByIds } from "@/features/media/queries";
import type { PostCardDTO } from "./dto";

/** Fecha de la noticia: la de publicación (al programarla o publicarla) o, si falta, la de creación. */
export const postDateSql = sql`coalesce(${posts.publishAt}, ${posts.createdAt})`;

/** Más reciente primero; el id desempata para que la paginación sea estable. */
export const newestFirst = [desc(postDateSql), desc(posts.id)] as const;

const cardColumns = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  featured: posts.featured,
  publishAt: posts.publishAt,
  createdAt: posts.createdAt,
  coverMediaId: posts.coverMediaId,
  categorySlug: postCategories.slug,
  categoryName: postCategories.name,
};

export type PostCardRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured: boolean;
  publishAt: Date | null;
  createdAt: Date;
  coverMediaId: string | null;
  categorySlug: string;
  categoryName: string;
};

/** Filas de tarjeta de las noticias que cumplen `where` (con su categoría, en una sola consulta). */
export async function selectCardRows(db: Db, where: SQL | undefined, { limit, offset = 0 }: { limit: number; offset?: number }): Promise<PostCardRow[]> {
  return db
    .select(cardColumns)
    .from(posts)
    .innerJoin(postCategories, eq(postCategories.id, posts.categoryId))
    .where(where)
    .orderBy(...newestFirst)
    .limit(limit)
    .offset(offset);
}

const mediaOf = (mediaById: Map<string, MediaDTO>, id: string | null) => (id ? (mediaById.get(id) ?? null) : null);

export function toCardDTO(row: PostCardRow, mediaById: Map<string, MediaDTO>): PostCardDTO {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: { slug: row.categorySlug, name: row.categoryName },
    featured: row.featured,
    date: (row.publishAt ?? row.createdAt).toISOString(),
    cover: mediaOf(mediaById, row.coverMediaId),
  };
}

/** Tarjetas de varios listados con **una** lectura de imágenes (nunca una por fila). */
export async function toCardDTOs(db: Db, ...lists: PostCardRow[][]): Promise<PostCardDTO[][]> {
  const ids = [...new Set(lists.flatMap((rows) => rows.flatMap((row) => (row.coverMediaId ? [row.coverMediaId] : []))))];
  const mediaById = await getMediaByIds(db, ids);
  return lists.map((rows) => rows.map((row) => toCardDTO(row, mediaById)));
}
