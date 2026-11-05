import { asc, eq, like, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighterGallery, fighters } from "@/db/schema/fighters";
import type { FighterPhotos } from "@/domain/fighter-photo";
import { normalizeSearchText } from "@/domain/search";
import type { MediaDTO } from "@/features/media/dto";
import { getMediaByIds } from "@/features/media/queries";
import type { FighterFilters } from "./schema";

// Piezas que comparten las lecturas públicas (`queries.ts`) y las del panel (`admin-queries.ts`).

export type PageOptions = { page?: number; pageSize?: number };

export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** Cada palabra de la búsqueda debe aparecer (sin tildes ni mayúsculas) en nombre, apellido o apodo. */
export function filterConditions(filters: FighterFilters): SQL[] {
  const conditions: SQL[] = [];
  for (const word of normalizeSearchText(filters.q ?? "").split(" ").filter(Boolean)) {
    conditions.push(like(fighters.searchText, `%${escapeLike(word)}%`));
  }
  if (filters.division) conditions.push(eq(divisions.slug, filters.division));
  if (filters.nationality) conditions.push(eq(fighters.nationality, filters.nationality.toUpperCase()));
  if (filters.gender) conditions.push(eq(fighters.gender, filters.gender));
  if (filters.status) conditions.push(eq(fighters.careerStatus, filters.status));
  return conditions;
}

export function pageWindow({ page = 1, pageSize }: PageOptions, fallbackSize: number) {
  const size = pageSize ?? fallbackSize;
  return { limit: size + 1, offset: (Math.max(page, 1) - 1) * size, size };
}

export async function loadMedia(db: Db, ids: (string | null)[]): Promise<Map<string, MediaDTO>> {
  return getMediaByIds(db, [...new Set(ids.filter((id): id is string => id !== null))]);
}

type FighterPhotoIds = { headshotMediaId: string | null; bodyMediaId: string | null };

/** Ids de las dos fotos de cada boxeador, para pedirlas todas en una sola lectura de imágenes. */
export function fighterPhotoIds(rows: FighterPhotoIds[]): (string | null)[] {
  return rows.flatMap((row) => [row.headshotMediaId, row.bodyMediaId]);
}

/**
 * Las dos fotos del boxeador (rostro y cuerpo; `null` la que no se subió) desde el mapa de esa lectura. Siempre van las
 * dos: cada pantalla elige con `pickFighterPhoto` y, si falta la que prefiere, usa la otra.
 */
export function fighterPhotos(mediaById: Map<string, MediaDTO>, { headshotMediaId, bodyMediaId }: FighterPhotoIds): FighterPhotos<MediaDTO> {
  const find = (id: string | null) => (id ? (mediaById.get(id) ?? null) : null);
  return { headshotMedia: find(headshotMediaId), bodyMedia: find(bodyMediaId) };
}

/** Ids de la galería del boxeador, en orden (una consulta indexada por `fighter_id`). */
export async function galleryIds(db: Db, fighterId: string): Promise<string[]> {
  const rows = await db.select({ mediaId: fighterGallery.mediaId }).from(fighterGallery).where(eq(fighterGallery.fighterId, fighterId)).orderBy(asc(fighterGallery.sortOrder));
  return rows.map((row) => row.mediaId);
}
