import { and, asc, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { bouts, cardSegments, eventGallery, events, type Event } from "@/db/schema/events";
import { loadWatchPlatforms, toWatchPlatforms } from "./watch-platforms";
import type { WatchPlatformDTO } from "./dto";
import type { MediaDTO } from "@/features/media/dto";
import { escapeLike } from "@/features/fighters/query-helpers";
import { getMediaByIds } from "@/features/media/queries";
import type { AdminEventRow } from "./dto";

const ADMIN_PAGE_SIZE = 50;

export type AdminEventFilters = { publication?: "draft" | "scheduled" | "published"; /** Texto dentro del nombre (buscador de eventos relacionados). */ q?: string };

/** Listado del panel: borradores y programados incluidos, la papelera no. Fecha más lejana primero. 50 por página. */
export async function listAdminEvents(
  db: Db,
  filters: AdminEventFilters,
  { page = 1, pageSize = ADMIN_PAGE_SIZE }: { page?: number; pageSize?: number } = {},
): Promise<{ items: AdminEventRow[]; hasMore: boolean }> {
  const conditions = [isNull(events.deletedAt)];
  if (filters.publication) conditions.push(eq(events.status, filters.publication));
  if (filters.q?.trim()) conditions.push(ilike(events.name, `%${escapeLike(filters.q.trim())}%`));

  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      name: events.name,
      number: events.number,
      startsAt: events.startsAt,
      venueCity: events.venueCity,
      eventStatus: events.eventStatus,
      status: events.status,
      publishAt: events.publishAt,
      updatedAt: events.updatedAt,
      posterMediaId: events.posterMediaId,
      // Un conteo por evento dentro de la misma consulta (usa el índice de `bouts.event_id`): sin N+1. Va con los
      // nombres escritos a mano: en una consulta de una sola tabla drizzle omite el prefijo de las columnas y la
      // subconsulta compararía `bouts.event_id` consigo misma.
      boutCount: sql<number>`(select count(*)::int from "bouts" where "bouts"."event_id" = "events"."id")`,
    })
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.startsAt), asc(events.id))
    .limit(pageSize + 1)
    .offset((Math.max(page, 1) - 1) * pageSize);

  const pageRows = rows.slice(0, pageSize);
  const posterIds = [...new Set(pageRows.flatMap((row) => (row.posterMediaId ? [row.posterMediaId] : [])))];
  const mediaById = await getMediaByIds(db, posterIds);
  return {
    items: pageRows.map(({ posterMediaId, ...row }) => ({ ...row, posterMedia: posterMediaId ? (mediaById.get(posterMediaId) ?? null) : null })),
    hasMore: rows.length > pageSize,
  };
}

/** Slug de un evento fuera de la papelera (enlace de vista previa). */
export async function getEventSlug(db: Db, id: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .limit(1);
  return row?.slug ?? null;
}

/** A qué evento pertenece un bloque (las actions de la cartelera invalidan la caché de ese evento). */
export async function getSegmentEventId(db: Db, segmentId: string): Promise<string | null> {
  const [row] = await db.select({ eventId: cardSegments.eventId }).from(cardSegments).where(eq(cardSegments.id, segmentId)).limit(1);
  return row?.eventId ?? null;
}

export async function getBoutEventId(db: Db, boutId: string): Promise<string | null> {
  const [row] = await db.select({ eventId: bouts.eventId }).from(bouts).where(eq(bouts.id, boutId)).limit(1);
  return row?.eventId ?? null;
}

/** Los boxeadores que están en la cartelera del evento (sus fichas muestran el historial y la próxima pelea). */
export async function getEventFighterIds(db: Db, eventId: string): Promise<string[]> {
  const rows = await db.select({ red: bouts.redFighterId, blue: bouts.blueFighterId }).from(bouts).where(eq(bouts.eventId, eventId));
  return [...new Set(rows.flatMap((row) => [row.red, row.blue]))];
}


export type EventForEdit = {
  event: Event;
  heroMedia: MediaDTO | null;
  heroMobileMedia: MediaDTO | null;
  posterMedia: MediaDTO | null;
  /** La galería, en orden. */
  gallery: MediaDTO[];
  watchPlatforms: WatchPlatformDTO[];
};

/** El evento (fuera de la papelera) y todas sus imágenes con una sola lectura de medios, para el formulario de edición. */
export async function getEventForEdit(db: Db, id: string): Promise<EventForEdit | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .limit(1);
  if (!event) return null;

  const galleryRows = await db.select({ mediaId: eventGallery.mediaId }).from(eventGallery).where(eq(eventGallery.eventId, id)).orderBy(asc(eventGallery.sortOrder));
  const platformRows = await loadWatchPlatforms(db, [id]);
  const ids = [event.heroMediaId, event.heroMobileMediaId, event.posterMediaId, ...platformRows.map((row) => row.mediaId), ...galleryRows.map((row) => row.mediaId)].filter((mediaId): mediaId is string => mediaId !== null);
  const mediaById = await getMediaByIds(db, [...new Set(ids)]);
  const media = (mediaId: string | null) => (mediaId ? (mediaById.get(mediaId) ?? null) : null);
  return {
    event,
    heroMedia: media(event.heroMediaId),
    heroMobileMedia: media(event.heroMobileMediaId),
    posterMedia: media(event.posterMediaId),
    gallery: galleryRows.flatMap((row) => mediaById.get(row.mediaId) ?? []),
    watchPlatforms: toWatchPlatforms(platformRows, id, mediaById, event.streamUrl),
  };
}
