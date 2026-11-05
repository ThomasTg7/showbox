import { asc, eq, inArray } from "drizzle-orm";
import type { Executor } from "@/db/types";
import { eventWatchPlatforms } from "@/db/schema/event-watch-platforms";
import type { MediaDTO } from "@/features/media/dto";
import type { WatchPlatformInput } from "./watch-schema";
import type { WatchPlatformDTO } from "./dto";

export async function loadWatchPlatforms(db: Executor, eventIds: string[]) {
  if (!eventIds.length) return [];
  return db.select().from(eventWatchPlatforms).where(inArray(eventWatchPlatforms.eventId, eventIds)).orderBy(asc(eventWatchPlatforms.sortOrder), asc(eventWatchPlatforms.id));
}

export function toWatchPlatforms(rows: Awaited<ReturnType<typeof loadWatchPlatforms>>, eventId: string, mediaById: Map<string, MediaDTO>, legacyUrl?: string | null): WatchPlatformDTO[] {
  const platforms = rows.filter((row) => row.eventId === eventId).map((row) => ({ name: row.name, url: row.url, media: row.mediaId ? mediaById.get(row.mediaId) ?? null : null }));
  return platforms.length || !legacyUrl ? platforms : [{ name: "Transmisión oficial", url: legacyUrl, media: null }];
}

/** Replaces one event's ordered platforms inside the event write transaction. */
export async function writeWatchPlatforms(tx: Executor, eventId: string, platforms: WatchPlatformInput[] | undefined): Promise<void> {
  if (platforms === undefined) return;
  await tx.delete(eventWatchPlatforms).where(eq(eventWatchPlatforms.eventId, eventId));
  if (platforms.length) await tx.insert(eventWatchPlatforms).values(platforms.map((platform, sortOrder) => ({ ...platform, eventId, sortOrder })));
}
