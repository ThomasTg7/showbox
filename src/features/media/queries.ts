import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { media } from "@/db/schema/media";
import { getStorage, type StorageDriver } from "@/lib/storage";
import { toMediaDTO, type MediaDTO } from "./dto";
import { DEFAULT_ADJUSTMENTS, type MediaEdit } from "./schema";

const visible = and(eq(media.status, "ready"), isNull(media.deletedAt));

/** Solo imágenes terminadas: una subida abortada (`pending`) nunca se muestra. */
export async function getMedia(db: Db, id: string, storage: StorageDriver = getStorage()): Promise<MediaDTO | null> {
  const [row] = await db.select().from(media).where(and(eq(media.id, id), visible)).limit(1);
  return row ? toMediaDTO(row, storage) : null;
}

/** Una sola consulta para listados y galerías (evita N+1). */
export async function getMediaByIds(
  db: Db,
  ids: string[],
  storage: StorageDriver = getStorage(),
): Promise<Map<string, MediaDTO>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(media).where(and(inArray(media.id, ids), visible));
  return new Map(rows.map((row) => [row.id, toMediaDTO(row, storage)]));
}

/** Parámetros guardados del editor (recorte, giro, enfoque, ajustes), para reabrir una imagen y seguir editándola. */
export async function getMediaEdit(db: Db, id: string): Promise<MediaEdit | null> {
  const [row] = await db.select().from(media).where(and(eq(media.id, id), visible)).limit(1);
  if (!row) return null;
  return {
    crop: row.crop,
    rotation: row.rotation as MediaEdit["rotation"],
    focal: { x: row.focalX, y: row.focalY },
    adjustments: { ...DEFAULT_ADJUSTMENTS, ...row.adjustments },
    alt: row.alt,
  };
}
