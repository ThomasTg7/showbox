import type { MediaRow } from "@/db/schema/media";
import type { MediaKind } from "@/domain/media-specs";
import type { StorageDriver } from "@/lib/storage";

export type MediaDTO = {
  id: string;
  kind: MediaKind;
  width: number;
  height: number;
  focal: { x: number; y: number };
  alt: string;
  /** Vacío para SVG: se usa `originalUrl` (sanitizado, sin variantes). `height` falta en imágenes guardadas antes de registrarlo. */
  variants: { width: number; height?: number; url: string }[];
  originalUrl: string;
};

export function toMediaDTO(row: MediaRow, storage: StorageDriver): MediaDTO {
  return {
    id: row.id,
    kind: row.kind,
    width: row.width ?? 0,
    height: row.height ?? 0,
    focal: { x: row.focalX, y: row.focalY },
    alt: row.alt,
    variants: row.variants.map(({ width, height, key }) => ({ width, height, url: storage.publicUrl(key) })),
    originalUrl: storage.publicUrl(row.originalKey),
  };
}
