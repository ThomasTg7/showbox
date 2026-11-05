import { and, asc, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { cardSegments, eventGallery, events, type Event } from "@/db/schema/events";
import type { Executor } from "@/db/types";
import { slugify, uniqueSlug } from "@/domain/slug";
import { logAudit } from "@/features/audit/log";
import { assertUsableMedia } from "@/features/media/service";
import { normalizePublishAt, publicationInputSchema, type PublicationInput } from "@/features/publication/schema";
import { softDelete } from "@/features/trash/trash";
import { fromLocalInputs, toLocalInputs } from "@/lib/local-time";
import { UserFacingError } from "@/lib/user-facing-error";
import { withMapsLocation } from "./location";
import { eventInputSchema, type EventData, type EventRawInput } from "./schema";
import { loadWatchPlatforms, writeWatchPlatforms } from "./watch-platforms";

const NOT_FOUND = "No se encontró el evento";

/** Valida el formulario y saca la ubicación del enlace de Google Maps (si se siguió un enlace corto, con una consulta a Google). */
async function parseEvent(input: EventRawInput): Promise<EventData> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  return withMapsLocation(parsed.data);
}

/** Columnas editables (sin slug, galería ni publicación, que se resuelven aparte). */
function editableColumns(data: EventData) {
  return {
    name: data.name,
    number: data.number,
    startsAt: data.startsAt,
    doorsAt: data.doorsAt,
    endsEstimatedAt: data.endsEstimatedAt,
    venueName: data.venueName,
    venueAddress: data.venueAddress,
    venueCity: data.venueCity,
    lat: data.lat,
    lng: data.lng,
    heroMediaId: data.heroMediaId,
    heroMobileMediaId: data.heroMobileMediaId,
    posterMediaId: data.posterMediaId,
    ticketUrl: data.ticketUrl,
    ticketProvider: data.ticketProvider,
    ticketTiers: data.ticketTiers,
    ticketPoints: data.ticketPoints,
    streamUrl: data.watchPlatforms === undefined ? data.streamUrl : data.watchPlatforms[0]?.url ?? null,
  };
}

async function assertUsableImages(db: Db, data: EventData): Promise<void> {
  await assertUsableMedia(db, [
    { id: data.heroMediaId, kind: "event_hero" },
    { id: data.heroMobileMediaId, kind: "event_hero_mobile" },
    { id: data.posterMediaId, kind: "event_poster" },
    ...data.galleryMediaIds.map((id) => ({ id, kind: "gallery" as const })),
    ...(data.watchPlatforms ?? []).map((platform) => ({ id: platform.mediaId, kind: "sponsor_logo" as const })),
  ]);
}

async function slugTaken(db: Executor, slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(exceptId ? and(eq(events.slug, slug), ne(events.id, exceptId)) : eq(events.slug, slug))
    .limit(1);
  return row !== undefined;
}

async function writeGallery(tx: Executor, eventId: string, mediaIds: string[]): Promise<void> {
  await tx.delete(eventGallery).where(eq(eventGallery.eventId, eventId));
  if (mediaIds.length > 0) {
    await tx.insert(eventGallery).values(mediaIds.map((mediaId, sortOrder) => ({ eventId, mediaId, sortOrder })));
  }
}

/**
 * La hora de cada bloque se guarda como instante del día del evento: si el evento cambia de día, cada bloque conserva su
 * hora (en Ecuador) en el día nuevo. Un solo UPDATE para todos los bloques con hora.
 */
async function moveSegmentTimesToDay(tx: Executor, eventId: string, date: string): Promise<void> {
  const rows = await tx
    .select({ id: cardSegments.id, startsAt: cardSegments.startsAt })
    .from(cardSegments)
    .where(and(eq(cardSegments.eventId, eventId), isNotNull(cardSegments.startsAt)));
  const moved = rows.flatMap((row) => {
    const startsAt = row.startsAt ? fromLocalInputs(date, toLocalInputs(row.startsAt).time) : null;
    return startsAt ? [{ id: row.id, startsAt }] : [];
  });
  if (moved.length === 0) return;
  const branches = moved.map((row) => sql`when ${row.id}::uuid then ${row.startsAt.toISOString()}::timestamptz`);
  await tx
    .update(cardSegments)
    .set({ startsAt: sql`case ${cardSegments.id} ${sql.join(branches, sql` `)} end` })
    .where(inArray(cardSegments.id, moved.map((row) => row.id)));
}

async function findEditableEvent(db: Executor, id: string): Promise<Event> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .limit(1);
  if (!row) throw new UserFacingError(NOT_FOUND);
  return row;
}

export async function createEvent(db: Db, input: EventRawInput, actorId: string): Promise<{ id: string; slug: string }> {
  const data = await parseEvent(input);
  await assertUsableImages(db, data);

  let slug: string;
  if (data.slug) {
    if (await slugTaken(db, data.slug)) throw new UserFacingError("Ese enlace ya lo usa otro evento");
    slug = data.slug;
  } else {
    slug = await uniqueSlug(slugify(data.name) || "evento", (candidate) => slugTaken(db, candidate));
  }

  const status = data.status ?? "draft";
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(events)
      .values({
        ...editableColumns(data),
        slug,
        eventStatus: data.eventStatus ?? "scheduled",
        status,
        publishAt: normalizePublishAt({ status, publishAt: data.publishAt }),
      })
      .returning({ id: events.id });
    if (!created) throw new UserFacingError("No se pudo guardar el evento");

    await writeGallery(tx, created.id, data.galleryMediaIds);
    await writeWatchPlatforms(tx, created.id, data.watchPlatforms);
    await logAudit(tx, { actorId, action: "create", entityType: "event", entityId: created.id, summary: `Creó el evento ${data.name}` });
    return { id: created.id, slug };
  });
}

/**
 * Edita el evento. El slug publicado no cambia al renombrarlo: solo si `input.slug` trae uno distinto.
 * La publicación solo cambia si `input.status` viene informado. El estado del evento solo cambia si `eventStatus` difiere
 * de `eventStatusBefore` (lo que el formulario mostraba al abrirse) o, sin él, de lo que el evento tiene ahora.
 */
export async function updateEvent(db: Db, id: string, input: EventRawInput, actorId: string): Promise<{ slug: string }> {
  const data = await parseEvent(input);
  const current = await findEditableEvent(db, id);
  await assertUsableImages(db, data);

  const slug = data.slug ?? current.slug;
  if (slug !== current.slug && (await slugTaken(db, slug, id))) throw new UserFacingError("Ese enlace ya lo usa otro evento");

  // «En vivo» y «Finalizado» los pone la noche de pelea: un formulario abierto antes no debe devolver el evento a como estaba.
  const statusChanged = data.eventStatus !== undefined && data.eventStatus !== (data.eventStatusBefore ?? current.eventStatus);

  await db.transaction(async (tx) => {
    await tx
      .update(events)
      .set({
        ...editableColumns(data),
        slug,
        ...(statusChanged ? { eventStatus: data.eventStatus } : {}),
        ...(data.status ? { status: data.status, publishAt: normalizePublishAt({ status: data.status, publishAt: data.publishAt }) } : {}),
      })
      .where(eq(events.id, id));
    await writeGallery(tx, id, data.galleryMediaIds);
    await writeWatchPlatforms(tx, id, data.watchPlatforms);
    const newDay = toLocalInputs(data.startsAt).date;
    if (newDay !== toLocalInputs(current.startsAt).date) await moveSegmentTimesToDay(tx, id, newDay);
    await logAudit(tx, { actorId, action: "update", entityType: "event", entityId: id, summary: `Editó el evento ${data.name}` });
  });
  return { slug };
}

const PUBLICATION_LABEL = { draft: "Pasó a borrador el evento", scheduled: "Programó la publicación del evento", published: "Publicó el evento" } as const;

export async function setEventPublication(db: Db, id: string, input: PublicationInput, actorId: string): Promise<void> {
  const parsed = publicationInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { status, publishAt } = parsed.data;

  const [updated] = await db
    .update(events)
    .set({ status, publishAt: normalizePublishAt({ status, publishAt }) })
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .returning({ name: events.name });
  if (!updated) throw new UserFacingError(NOT_FOUND);

  await logAudit(db, { actorId, action: "publish", entityType: "event", entityId: id, summary: `${PUBLICATION_LABEL[status]} ${updated.name}` });
}

/** Envía el evento a la papelera (se recupera desde Papelera; se elimina solo, con su cartelera, a los 30 días). */
export async function deleteEvent(db: Db, id: string, actorId: string): Promise<void> {
  try {
    await softDelete(db, "event", id, actorId);
  } catch (error) {
    // Solo «no existe o ya estaba en la papelera» se explica así; un fallo de la base sigue su curso (y queda en el log).
    throw error instanceof UserFacingError ? new UserFacingError(NOT_FOUND) : error;
  }
}

/**
 * Copia el evento como borrador: mismos datos, entradas y bloques, sin peleas, imágenes ni galería (cada evento sube
 * las suyas: reeditar el afiche de uno no cambia el del otro).
 */
export async function duplicateEvent(db: Db, id: string, actorId: string): Promise<{ id: string; slug: string }> {
  const source = await findEditableEvent(db, id);
  const name = `${source.name} (copia)`;
  const slug = await uniqueSlug(slugify(name), (candidate) => slugTaken(db, candidate));

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(events)
      .values({
        slug,
        name,
        startsAt: source.startsAt,
        doorsAt: source.doorsAt,
        endsEstimatedAt: source.endsEstimatedAt,
        venueName: source.venueName,
        venueAddress: source.venueAddress,
        venueCity: source.venueCity,
        lat: source.lat,
        lng: source.lng,
        ticketUrl: source.ticketUrl,
        ticketProvider: source.ticketProvider,
        ticketTiers: source.ticketTiers,
        ticketPoints: source.ticketPoints,
        streamUrl: source.streamUrl,
      })
      .returning({ id: events.id });
    if (!created) throw new UserFacingError("No se pudo duplicar el evento");

    const platforms = await loadWatchPlatforms(tx, [id]);
    await writeWatchPlatforms(tx, created.id, platforms.map(({ name, url, mediaId }) => ({ name, url, mediaId })));
    const segments = await tx.select().from(cardSegments).where(eq(cardSegments.eventId, id)).orderBy(asc(cardSegments.sortOrder), asc(cardSegments.id));
    if (segments.length > 0) {
      await tx
        .insert(cardSegments)
        .values(segments.map((segment) => ({ eventId: created.id, name: segment.name, sortOrder: segment.sortOrder, startsAt: segment.startsAt })));
    }
    await logAudit(tx, { actorId, action: "create", entityType: "event", entityId: created.id, summary: `Duplicó el evento ${source.name}` });
    return { id: created.id, slug };
  });
}
