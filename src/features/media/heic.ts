import { MEDIA_SPECS, type MediaKind } from "@/domain/media-specs";

// Las fotos HEIC (las del iPhone copiadas a un computador) no las lee el servidor (sharp sin HEVC) ni la mayoría de los
// navegadores: se convierten a JPG en el navegador antes de subirlas. El convertidor (WASM, ~3 MB) se descarga solo
// cuando alguien elige un HEIC.

const HEIC_TYPES = ["image/heic", "image/heif"];

/** Lo que se suma al `accept` del selector de archivos donde se aceptan fotos. */
export const HEIC_ACCEPT = [".heic", ".heif", ...HEIC_TYPES];

/** Por tipo o, si el sistema no lo informa (Windows suele dejarlo vacío), por la extensión. */
export function isHeicFile(file: { name: string; type: string }): boolean {
  return HEIC_TYPES.includes(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** Donde se aceptan fotos (JPG) se acepta también HEIC: llega convertido. */
export function acceptsHeic(kind: MediaKind): boolean {
  return MEDIA_SPECS[kind].accepts.includes("image/jpeg");
}

export function jpegName(name: string): string {
  return `${name.replace(/\.[^./\\]+$/, "")}.jpg`;
}

export async function convertHeic(file: File): Promise<File> {
  const { heicTo } = await import("heic-to/next");
  const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  return new File([jpeg], jpegName(file.name), { type: "image/jpeg" });
}
