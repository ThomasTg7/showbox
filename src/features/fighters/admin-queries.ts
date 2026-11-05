import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighters, type Fighter } from "@/db/schema/fighters";
import type { MediaDTO } from "@/features/media/dto";
import type { AdminFighterRow } from "./dto";
import { fighterPhotoIds, fighterPhotos, filterConditions, galleryIds, loadMedia, pageWindow, type PageOptions } from "./query-helpers";
import type { FighterFilters } from "./schema";

const ADMIN_PAGE_SIZE = 50;

export type AdminFighterFilters = FighterFilters & { publication?: "draft" | "scheduled" | "published" };

/** Listado del panel: incluye borradores y programados, no la papelera. Más recientes primero. */
export async function listAdminFighters(
  db: Db,
  filters: AdminFighterFilters,
  options: PageOptions = {},
): Promise<{ items: AdminFighterRow[]; hasMore: boolean }> {
  const { limit, offset, size } = pageWindow(options, ADMIN_PAGE_SIZE);
  const conditions = [isNull(fighters.deletedAt), ...filterConditions(filters)];
  if (filters.publication) conditions.push(eq(fighters.status, filters.publication));

  const rows = await db
    .select({
      id: fighters.id,
      slug: fighters.slug,
      firstName: fighters.firstName,
      lastName: fighters.lastName,
      nickname: fighters.nickname,
      nationality: fighters.nationality,
      careerStatus: fighters.careerStatus,
      status: fighters.status,
      publishAt: fighters.publishAt,
      updatedAt: fighters.updatedAt,
      bodyMediaId: fighters.bodyMediaId,
      headshotMediaId: fighters.headshotMediaId,
      divisionName: divisions.name,
    })
    .from(fighters)
    .innerJoin(divisions, eq(fighters.divisionId, divisions.id))
    .where(and(...conditions))
    .orderBy(desc(fighters.updatedAt), asc(fighters.id))
    .limit(limit)
    .offset(offset);

  const page = rows.slice(0, size);
  const mediaById = await loadMedia(db, fighterPhotoIds(page));
  return {
    items: page.map(({ bodyMediaId, headshotMediaId, ...row }) => ({ ...row, ...fighterPhotos(mediaById, { bodyMediaId, headshotMediaId }) })),
    hasMore: rows.length > size,
  };
}

/** Datos crudos, las dos fotos y la galería para el formulario de edición (una sola lectura de imágenes). */
export async function getFighterForEdit(
  db: Db,
  id: string,
): Promise<{ fighter: Fighter; bodyMedia: MediaDTO | null; headshotMedia: MediaDTO | null; gallery: MediaDTO[] } | null> {
  const [fighter] = await db
    .select()
    .from(fighters)
    .where(and(eq(fighters.id, id), isNull(fighters.deletedAt)))
    .limit(1);
  if (!fighter) return null;

  const gallery = await galleryIds(db, id);
  const mediaById = await loadMedia(db, [fighter.bodyMediaId, fighter.headshotMediaId, ...gallery]);
  return {
    fighter,
    ...fighterPhotos(mediaById, fighter),
    gallery: gallery.flatMap((mediaId) => mediaById.get(mediaId) ?? []),
  };
}

/** Slug de un boxeador fuera de la papelera (enlace de vista previa). */
export async function getFighterSlug(db: Db, id: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: fighters.slug })
    .from(fighters)
    .where(and(eq(fighters.id, id), isNull(fighters.deletedAt)))
    .limit(1);
  return row?.slug ?? null;
}
