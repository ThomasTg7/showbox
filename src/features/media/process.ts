import sharp, { type Metadata, type Sharp } from "sharp";
import { MAX_INPUT_PIXELS, MEDIA_SPECS, clampCrop, variantWidthsFor, type Crop, type MediaKind, type Size } from "@/domain/media-specs";
import type { MediaEdit } from "./schema";

const WEBP_OPTIONS = { quality: 82, alphaQuality: 90 } as const;

/** Tamaño de la imagen tal como la ve la persona: con EXIF aplicado y ya girada. */
export function visibleSize(
  { width = 0, height = 0, orientation = 1 }: Metadata,
  rotation: MediaEdit["rotation"] = 0,
): Size {
  const [w, h] = orientation >= 5 ? [height, width] : [width, height];
  return rotation === 90 || rotation === 270 ? { w: h, h: w } : { w, h };
}

/** Sin recorte, se toma el mayor recorte con la proporción del tipo, centrado en el punto de enfoque. */
function defaultCrop(size: Size, aspect: number | null, focal: MediaEdit["focal"]): Crop {
  if (aspect === null) return { x: 0, y: 0, width: size.w, height: size.h };

  const width = Math.min(size.w, size.h * aspect);
  const height = width / aspect;
  return {
    x: Math.min(Math.max(0, focal.x * size.w - width / 2), size.w - width),
    y: Math.min(Math.max(0, focal.y * size.h - height / 2), size.h - height),
    width,
    height,
  };
}

/** La nitidez se aplica después de achicar: así realza el detalle que de verdad queda en cada variante. */
function sharpen(pipeline: Sharp, amount: number): Sharp {
  return amount > 0 ? pipeline.sharpen({ sigma: 0.6 + amount * 0.8, m1: 1, m2: 1 + amount * 2 }) : pipeline;
}

export async function renderVariants(
  original: Buffer,
  kind: MediaKind,
  edit: MediaEdit,
): Promise<{ width: number; height: number; buffer: Buffer }[]> {
  const input = () => sharp(original, { limitInputPixels: MAX_INPUT_PIXELS });
  const size = visibleSize(await input().metadata(), edit.rotation);
  const crop = clampCrop(edit.crop ?? defaultCrop(size, MEDIA_SPECS[kind].aspect, edit.focal), size);
  const widths = variantWidthsFor(kind, crop.width);
  const { brightness, contrast, saturation, sharpness } = edit.adjustments;

  // Recorte, ajustes y reducción al ancho mayor se aplican una sola vez; cada variante sale de ese resultado.
  // Reducir antes de pasar a `raw` evita tener en memoria la foto completa sin comprimir (48 MP ≈ 190 MB).
  let pipeline = input().autoOrient();
  if (edit.rotation !== 0) pipeline = pipeline.rotate(edit.rotation);
  pipeline = pipeline.extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height });
  const largest = Math.max(...widths);
  if (largest < crop.width) pipeline = pipeline.resize({ width: largest });
  if (brightness !== 1 || saturation !== 1) pipeline = pipeline.modulate({ brightness, saturation });
  if (contrast !== 1) pipeline = pipeline.linear(contrast, 128 * (1 - contrast));

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

  return Promise.all(
    widths.map(async (width) => {
      const resized = sharp(data, { raw: info }).resize({ width, withoutEnlargement: true });
      const output = await sharpen(resized, sharpness).webp(WEBP_OPTIONS).toBuffer({ resolveWithObject: true });
      return { width: output.info.width, height: output.info.height, buffer: output.data };
    }),
  );
}

/**
 * DOMPurify en el servidor usa jsdom, que en Vercel no carga (`ERR_REQUIRE_ESM` en una de sus dependencias). Se importa
 * solo al limpiar un SVG para que el resto de las imágenes, la limpieza diaria y el panel no dependan de él.
 */
export async function sanitizeSvg(svg: string): Promise<string> {
  const { default: DOMPurify } = await import("isomorphic-dompurify");
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}
