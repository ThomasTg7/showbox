import { randomUUID } from "node:crypto";
import { and, eq, exists, inArray, isNull, lt, not, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import sharp, { type Metadata } from "sharp";
import type { Db } from "@/db";
import { media, type MediaRow, type StoredVariant } from "@/db/schema/media";
import { MAX_INPUT_PIXELS, MAX_UPLOAD_BYTES, MEDIA_SPECS, checkResolution, isMediaKind, isMediaKindCompatible, type MediaKind } from "@/domain/media-specs";
import type { StorageDriver } from "@/lib/storage";
import { UserFacingError } from "@/lib/user-facing-error";
import { toMediaDTO, type MediaDTO } from "./dto";
import { renderVariants, sanitizeSvg, visibleSize } from "./process";
import { MEDIA_REFERENCES, type MediaReference } from "./references";
import type { MediaEdit } from "./schema";

const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000;
const ORPHAN_BATCH = 200;
/** Una imagen sin dueño se conserva este tiempo: puede estar subida en un formulario que aún no se guarda. */
const UNREFERENCED_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

const FORMAT_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** Tipo real según el contenido. AVIF y HEIC comparten contenedor (`heif`): solo AVIF (AV1) se puede procesar aquí. */
function detectMime({ format, compression }: Metadata): string | undefined {
  if (format === "heif") return compression === "av1" ? "image/avif" : undefined;
  return format ? FORMAT_MIME[format] : undefined;
}

/** Error con un mensaje pensado para mostrarse tal cual a la persona. */
/** Error de imágenes con mensaje para la persona (la action lo muestra tal cual). */
export class MediaError extends UserFacingError {}

export type UploadInput = { kind: MediaKind; contentType: string; size: number };

export async function createUpload(
  db: Db,
  storage: StorageDriver,
  input: UploadInput,
): Promise<{ mediaId: string; uploadUrl: string; headers: Record<string, string> }> {
  if (!isMediaKind(input.kind)) throw new MediaError("Tipo de imagen inválido");
  if (input.size > MAX_UPLOAD_BYTES) throw new MediaError("El archivo supera 15 MB");
  if (!MEDIA_SPECS[input.kind].accepts.includes(input.contentType)) throw new MediaError("Formato no permitido");

  const mediaId = randomUUID();
  const originalKey = `originals/${input.kind}/${mediaId}.${EXTENSIONS[input.contentType]}`;
  const { url, headers } = await storage.presignPut(originalKey, input.contentType, MAX_UPLOAD_BYTES);
  await db.insert(media).values({ id: mediaId, kind: input.kind, originalKey, mime: input.contentType });

  return { mediaId, uploadUrl: url, headers };
}

/**
 * Las actions que guardan ids de imagen los validan aquí: cada uno debe existir, estar terminado (`ready`) y ser
 * del tipo que el campo espera. Una sola consulta para todos; los `null` (campo vacío) se ignoran.
 */
export async function assertUsableMedia(db: Db, refs: { id: string | null; kind: MediaKind }[]): Promise<void> {
  const wanted = refs.filter((ref): ref is { id: string; kind: MediaKind } => ref.id !== null);
  if (wanted.length === 0) return;

  const rows = await db
    .select({ id: media.id, kind: media.kind })
    .from(media)
    .where(and(inArray(media.id, wanted.map((ref) => ref.id)), eq(media.status, "ready"), isNull(media.deletedAt)));
  const kindById = new Map(rows.map((row) => [row.id, row.kind]));

  if (wanted.some((ref) => !isMediaKindCompatible(kindById.get(ref.id), ref.kind))) {
    throw new MediaError("La imagen ya no está disponible. Súbela de nuevo.");
  }
}

async function discardUpload(db: Db, storage: StorageDriver, row: MediaRow): Promise<void> {
  await storage.delete(row.originalKey).catch(() => undefined);
  await db.delete(media).where(eq(media.id, row.id));
}

async function findMedia(db: Db, id: string): Promise<MediaRow> {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) throw new MediaError("No se encontró la imagen");
  return row;
}

export async function finalizeUpload(
  db: Db,
  storage: StorageDriver,
  mediaId: string,
): Promise<{ width: number; height: number; warning?: string }> {
  const row = await findMedia(db, mediaId);
  if (row.status !== "pending") throw new MediaError("La imagen ya estaba procesada");

  let original = await storage.get(row.originalKey).catch(() => null);
  if (!original) throw new MediaError("No se recibió el archivo");

  // La URL firmada de S3 no limita el tamaño: se verifica aquí con el archivo real.
  if (original.length > MAX_UPLOAD_BYTES) {
    await discardUpload(db, storage, row);
    throw new MediaError("El archivo supera 15 MB");
  }

  if (row.mime === "image/svg+xml") {
    original = Buffer.from(await sanitizeSvg(original.toString("utf8")), "utf8");
  }

  let metadata: Metadata;
  try {
    // Solo lee la cabecera; el tope de píxeles se revisa abajo con un mensaje claro.
    metadata = await sharp(original, { limitInputPixels: false }).metadata();
  } catch {
    metadata = {} as Metadata;
  }
  const { w, h } = visibleSize(metadata);
  // Se confía en el contenido real, no en la etiqueta del archivo (un PNG guardado como .jpg es común).
  // Lo que no puede cambiar es ser SVG o no: el SVG se sanitiza y no lleva variantes.
  const actualMime = detectMime(metadata);
  const isSvg = row.mime === "image/svg+xml";
  if (!actualMime || w === 0 || h === 0 || (actualMime === "image/svg+xml") !== isSvg || !MEDIA_SPECS[row.kind].accepts.includes(actualMime)) {
    await discardUpload(db, storage, row);
    throw new MediaError("El archivo no es una imagen válida");
  }
  if (!isSvg && w * h > MAX_INPUT_PIXELS) {
    await discardUpload(db, storage, row);
    throw new MediaError("La imagen tiene demasiados píxeles (máx. 50 megapíxeles). Achícala e inténtalo de nuevo.");
  }

  if (isSvg) {
    await storage.put(row.originalKey, original, row.mime);
  }
  await db.update(media).set({ width: w, height: h, mime: actualMime }).where(eq(media.id, row.id));

  const { warning } = checkResolution(row.kind, w, h);
  return { width: w, height: h, ...(warning ? { warning } : {}) };
}

export async function saveMediaEdit(
  db: Db,
  storage: StorageDriver,
  mediaId: string,
  edit: MediaEdit,
): Promise<MediaDTO> {
  const row = await findMedia(db, mediaId);
  if (row.width === null || row.height === null) throw new MediaError("La imagen aún no terminó de subirse");

  const isSvg = row.mime === "image/svg+xml";
  let variants: StoredVariant[] = [];

  if (!isSvg) {
    const rendered = await renderVariants(await storage.get(row.originalKey), row.kind, edit);
    // La versión va en la clave: las variantes nuevas nunca pisan a las anteriores y se cachean para siempre.
    const version = randomUUID().slice(0, 8);
    variants = await Promise.all(
      rendered.map(async ({ width, height, buffer }) => {
        const key = `variants/${row.id}/${version}/${width}.webp`;
        await storage.put(key, buffer, "image/webp");
        return { width, height, key };
      }),
    );
  }

  // Se bloquea la fila para leer las variantes que de verdad se reemplazan: si dos ediciones se guardan
  // a la vez, cada una borra las de la anterior y no quedan archivos sin dueño.
  const { saved, replaced } = await db.transaction(async (tx) => {
    const [current] = await tx.select({ variants: media.variants }).from(media).where(eq(media.id, row.id)).for("update");
    const [updated] = await tx
      .update(media)
      .set({
        crop: edit.crop,
        rotation: edit.rotation,
        focalX: edit.focal.x,
        focalY: edit.focal.y,
        adjustments: edit.adjustments,
        variants,
        alt: edit.alt,
        status: "ready",
      })
      .where(eq(media.id, row.id))
      .returning();
    return { saved: updated, replaced: current?.variants ?? [] };
  });

  await Promise.allSettled(replaced.map((variant) => storage.delete(variant.key)));
  return toMediaDTO(saved, storage);
}

/** Subidas que nunca se finalizaron (pestaña cerrada, error de red) con más de 24 h. */
export async function purgeOrphanMedia(db: Db, storage: StorageDriver, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - ORPHAN_AFTER_MS);
  const orphans = await db
    .select({ id: media.id, originalKey: media.originalKey })
    .from(media)
    .where(and(eq(media.status, "pending"), lt(media.createdAt, cutoff)))
    .limit(ORPHAN_BATCH);

  if (orphans.length === 0) return 0;

  await Promise.allSettled(orphans.map((orphan) => storage.delete(orphan.originalKey)));
  await db.delete(media).where(inArray(media.id, orphans.map((orphan) => orphan.id)));
  return orphans.length;
}

function isReferenced(reference: MediaReference) {
  if ("isReferenced" in reference) return reference.isReferenced(sql`${media.id}`);
  return exists(
    sql`(select 1 from ${reference.column.table as PgTable} where ${reference.column} = ${media.id})`,
  );
}

/**
 * Imágenes terminadas, de más de 7 días, que ninguna fila referencia (ver `MEDIA_REFERENCES`): archivos y fila.
 * Se borra en una sola sentencia con la condición incluida, así una imagen que un formulario acaba de usar no se pierde
 * (y `on delete restrict` impide borrar una en uso aunque algo falle).
 */
export async function purgeUnreferencedMedia(
  db: Db,
  storage: StorageDriver,
  now: Date,
  references: MediaReference[] = MEDIA_REFERENCES,
): Promise<number> {
  const cutoff = new Date(now.getTime() - UNREFERENCED_AFTER_MS);
  const unused = and(eq(media.status, "ready"), lt(media.createdAt, cutoff), ...references.map((reference) => not(isReferenced(reference))));

  const deleted = await db
    .delete(media)
    .where(inArray(media.id, db.select({ id: media.id }).from(media).where(unused).limit(ORPHAN_BATCH)))
    .returning({ originalKey: media.originalKey, variants: media.variants });

  const keys = deleted.flatMap((row) => [row.originalKey, ...row.variants.map((variant) => variant.key)]);
  await Promise.allSettled(keys.map((key) => storage.delete(key)));
  return deleted.length;
}
