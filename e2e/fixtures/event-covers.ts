import sharp from "sharp";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { media } from "@/db/schema/media";
import { createUpload, finalizeUpload, saveMediaEdit } from "@/features/media/service";
import { DEFAULT_EDIT } from "@/features/media/schema";
import { getStorage } from "@/lib/storage";

/** Real media variants exercise mobile <picture> selection before public-page caching. */
export async function seedEventCovers(db: Db): Promise<void> {
  const storage = getStorage();
  const ids: string[] = [];
  for (const [kind, width, height] of [["event_hero", 1920, 1080], ["event_hero_mobile", 1080, 1350]] as const) {
    const bytes = await sharp({ create: { width, height, channels: 3, background: "#38201b" } }).webp().toBuffer();
    const upload = await createUpload(db, storage, { kind, contentType: "image/webp", size: bytes.length });
    const [row] = await db.select().from(media).where(eq(media.id, upload.mediaId));
    await storage.put(row.originalKey, bytes, "image/webp");
    await finalizeUpload(db, storage, row.id);
    await saveMediaEdit(db, storage, row.id, { ...DEFAULT_EDIT, alt: "Portada de prueba ShowBox" });
    ids.push(row.id);
  }
  await db.update(events).set({ heroMediaId: ids[0], heroMobileMediaId: ids[1] }).where(eq(events.slug, "showbox-fight-night-5"));
}
