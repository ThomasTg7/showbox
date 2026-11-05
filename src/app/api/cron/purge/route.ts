import { db } from "@/db";
import { purgeOrphanMedia, purgeUnreferencedMedia } from "@/features/media/service";
import { handlePurge } from "@/features/trash/purge-handler";
import { purgeExpired } from "@/features/trash/trash";
import { getStorage } from "@/lib/storage";

export async function GET(request: Request): Promise<Response> {
  return handlePurge(request, {
    db,
    purgeExpired,
    purgeOrphanMedia: (database, now) => purgeOrphanMedia(database, getStorage(), now),
    purgeUnreferencedMedia: (database, now) => purgeUnreferencedMedia(database, getStorage(), now),
  });
}
