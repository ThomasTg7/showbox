import { and, asc, desc, eq, inArray, isNull, not, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { publicScope } from "@/db/public-scope";
import { bouts, cardSegments, eventGallery, events, type Event } from "@/db/schema/events";
import type { MediaDTO } from "@/features/media/dto";
import { getMediaByIds } from "@/features/media/queries";
import { boutMediaIds, selectBoutRows, toBoutDTO, type BoutRow } from "./bout-rows";
import type { EventCardDTO, EventPageDTO, SegmentDTO } from "./dto";
import { upcomingEvents } from "./event-scope";
import { pickMainBout } from "./main-bout";
import { loadWatchPlatforms, toWatchPlatforms } from "./watch-platforms";

const PUBLIC_PAGE_SIZE = 12;

type PreviewOptions = { preview?: boolean };
type PageOptions = { page?: number; pageSize?: number };

function mediaOf(mediaById: Map<string, MediaDTO>, id: string | null): MediaDTO | null {
  return id ? (mediaById.get(id) ?? null) : null;
}

function eventCardBase(event: Event, mediaById: Map<string, MediaDTO>) {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    number: event.number,
    startsAt: event.startsAt.toISOString(),
    endsEstimatedAt: event.endsEstimatedAt?.toISOString() ?? null,
    eventStatus: event.eventStatus,
    ticketUrl: event.ticketUrl,
    ticketTiers: event.ticketTiers,
    ticketPoints: event.ticketPoints,
    heroMedia: mediaOf(mediaById, event.heroMediaId),
    heroMobileMedia: mediaOf(mediaById, event.heroMobileMediaId),
    posterMedia: mediaOf(mediaById, event.posterMediaId),
  };
}

const eventImageIds = (event: Event) => [event.heroMediaId, event.heroMobileMediaId, event.posterMediaId];

async function loadMedia(db: Db, ids: (string | null)[]): Promise<Map<string, MediaDTO>> {
  return getMediaByIds(db, [...new Set(ids.filter((id): id is string => id !== null))]);
}

/**
 * Lectura mínima (una fila por índice único) para saber si el evento es público *ahora* y qué imágenes lleva
 * (sus etiquetas de caché) y en qué estado está (uno en vivo se cachea por poco tiempo). Va antes de la lectura
 * cacheada: un borrador o uno en la papelera nunca sale de la caché.
 */
export async function getPublicEventRef(
  db: Db,
  slug: string,
): Promise<{
  id: string;
  eventStatus: Event["eventStatus"];
  heroMediaId: string | null;
  heroMobileMediaId: string | null;
  posterMediaId: string | null;
} | null> {
  const [row] = await db
    .select({
      id: events.id,
      eventStatus: events.eventStatus,
      heroMediaId: events.heroMediaId,
      heroMobileMediaId: events.heroMobileMediaId,
      posterMediaId: events.posterMediaId,
    })
    .from(events)
    .where(and(eq(events.slug, slug), publicScope(events)))
    .limit(1);
  return row ?? null;
}

/** Página del evento: bloques ordenados con sus peleas y todas las imágenes en una sola lectura de medios. Con `preview`, incluye borradores. */
export async function getPublicEventBySlug(db: Db, slug: string, { preview = false }: PreviewOptions = {}): Promise<EventPageDTO | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), preview ? isNull(events.deletedAt) : publicScope(events)))
    .limit(1);
  if (!event) return null;

  const [segmentRows, boutRows, galleryRows, platformRows] = await Promise.all([
    db.select().from(cardSegments).where(eq(cardSegments.eventId, event.id)).orderBy(asc(cardSegments.sortOrder), asc(cardSegments.id)),
    selectBoutRows(db, eq(bouts.eventId, event.id)),
    db.select({ mediaId: eventGallery.mediaId }).from(eventGallery).where(eq(eventGallery.eventId, event.id)).orderBy(asc(eventGallery.sortOrder)),
    loadWatchPlatforms(db, [event.id]),
  ]);

  const boutsBySegment = new Map<string, BoutRow[]>();
  for (const row of boutRows) boutsBySegment.set(row.segmentId, [...(boutsBySegment.get(row.segmentId) ?? []), row]);
  const mediaById = await loadMedia(db, [
    ...eventImageIds(event),
    ...galleryRows.map((row) => row.mediaId),
    ...platformRows.map((row) => row.mediaId),
    ...boutRows.flatMap((row) => boutMediaIds(row, true)),
  ]);

  const segments: SegmentDTO[] = segmentRows.map((segment) => ({
    id: segment.id,
    name: segment.name,
    startsAt: segment.startsAt?.toISOString() ?? null,
    bouts: (boutsBySegment.get(segment.id) ?? []).map((row) => toBoutDTO(row, mediaById, true)),
  }));

  return {
    ...eventCardBase(event, mediaById),
    doorsAt: event.doorsAt?.toISOString() ?? null,
    venue: { name: event.venueName, address: event.venueAddress, city: event.venueCity, lat: event.lat, lng: event.lng },
    ticketProvider: event.ticketProvider,
    streamUrl: event.streamUrl,
    watchPlatforms: toWatchPlatforms(platformRows, event.id, mediaById, event.streamUrl),
    gallery: galleryRows.flatMap((row) => mediaById.get(row.mediaId) ?? []),
    segments,
  };
}

const isCancelledRow = (row: BoutRow) => row.boutStatus === "cancelled";

/** La pelea estelar de cada evento, en dos consultas para toda la página (peleas de todos los eventos y su orden de bloques). */
async function loadMainBouts(db: Db, eventIds: string[]): Promise<Map<string, BoutRow>> {
  if (eventIds.length === 0) return new Map();
  const [segmentRows, boutRows] = await Promise.all([
    db
      .select({ id: cardSegments.id })
      .from(cardSegments)
      .where(inArray(cardSegments.eventId, eventIds))
      .orderBy(asc(cardSegments.sortOrder), asc(cardSegments.id)),
    selectBoutRows(db, inArray(bouts.eventId, eventIds)),
  ]);

  // Las filas ya vienen por `sort_order` de pelea: ordenar (de forma estable) por el lugar de su bloque deja el orden de cartelera.
  const segmentRank = new Map(segmentRows.map((segment, index) => [segment.id, index]));
  const inCardOrder = [...boutRows].sort((a, b) => (segmentRank.get(a.segmentId) ?? 0) - (segmentRank.get(b.segmentId) ?? 0));

  const boutsByEvent = new Map<string, BoutRow[]>();
  for (const row of inCardOrder) boutsByEvent.set(row.eventId, [...(boutsByEvent.get(row.eventId) ?? []), row]);

  const mainByEvent = new Map<string, BoutRow>();
  for (const [eventId, eventBouts] of boutsByEvent) {
    const main = pickMainBout(eventBouts, isCancelledRow);
    if (main) mainByEvent.set(eventId, main);
  }
  return mainByEvent;
}

async function toEventCards(db: Db, rows: Event[]): Promise<EventCardDTO[]> {
  const eventIds = rows.map((event) => event.id);
  const [mainBouts, platformRows] = await Promise.all([loadMainBouts(db, eventIds), loadWatchPlatforms(db, eventIds)]);
  const mediaById = await loadMedia(db, [...rows.flatMap(eventImageIds), ...platformRows.map((row) => row.mediaId), ...[...mainBouts.values()].flatMap((row) => boutMediaIds(row, true))]);
  return rows.map((event) => {
    const main = mainBouts.get(event.id);
    return { ...eventCardBase(event, mediaById), watchPlatforms: toWatchPlatforms(platformRows, event.id, mediaById, event.streamUrl), venueName: event.venueName, venueCity: event.venueCity, mainBout: main ? toBoutDTO(main, mediaById, true) : null };
  });
}

/** Próximos (fecha ascendente) o pasados (descendente). Solo eventos públicos. 12 por página. */
export async function listPublicEvents(
  db: Db,
  filters: { when: "upcoming" | "past" },
  { page = 1, pageSize = PUBLIC_PAGE_SIZE }: PageOptions = {},
): Promise<{ items: EventCardDTO[]; hasMore: boolean }> {
  const upcoming = filters.when === "upcoming";
  const scope: SQL = upcoming ? upcomingEvents() : not(upcomingEvents());
  const rows = await db
    .select()
    .from(events)
    .where(and(publicScope(events), scope))
    .orderBy(upcoming ? asc(events.startsAt) : desc(events.startsAt), asc(events.id))
    .limit(pageSize + 1)
    .offset((Math.max(page, 1) - 1) * pageSize);

  return { items: await toEventCards(db, rows.slice(0, pageSize)), hasMore: rows.length > pageSize };
}

/** El próximo evento público (el más cercano, o el que está en vivo). */
export async function getNextEvent(db: Db): Promise<EventCardDTO | null> {
  const { items } = await listPublicEvents(db, { when: "upcoming" }, { pageSize: 1 });
  return items[0] ?? null;
}
