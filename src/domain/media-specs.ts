export const MEDIA_KINDS = [
  "fighter_body",
  "fighter_headshot",
  "event_hero",
  "event_hero_mobile",
  "event_poster",
  "news_cover",
  "gallery",
  "sponsor_logo",
  "og_image",
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

export type Size = { w: number; h: number };
export type Crop = { x: number; y: number; width: number; height: number };

export type MediaSpec = {
  /** Ancho / alto del recorte; `null` = libre. */
  aspect: number | null;
  /** Sin recorte fijo: el sitio muestra la imagen completa dentro de una caja con esta proporción (logos). */
  box?: number;
  /** Proporción para mostrar a las personas ("2:3"). */
  aspectLabel: string;
  recommended: Size;
  min: Size;
  variantWidths: number[];
  accepts: string[];
  label: string;
};

const RASTER = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export const MEDIA_SPECS: Record<MediaKind, MediaSpec> = {
  fighter_body: { aspect: 2 / 3, aspectLabel: "2:3", recommended: { w: 1200, h: 1800 }, min: { w: 800, h: 1200 }, variantWidths: [400, 800, 1200], accepts: RASTER, label: "Foto de cuerpo completo" },
  fighter_headshot: { aspect: 1, aspectLabel: "1:1", recommended: { w: 800, h: 800 }, min: { w: 400, h: 400 }, variantWidths: [200, 400, 800], accepts: RASTER, label: "Foto de rostro" },
  event_hero: { aspect: 16 / 9, aspectLabel: "16:9", recommended: { w: 1920, h: 1080 }, min: { w: 1280, h: 720 }, variantWidths: [800, 1280, 1920], accepts: RASTER, label: "Portada del evento" },
  event_hero_mobile: { aspect: 4 / 5, aspectLabel: "4:5", recommended: { w: 1080, h: 1350 }, min: { w: 720, h: 900 }, variantWidths: [540, 1080], accepts: RASTER, label: "Portada del evento (móvil)" },
  event_poster: { aspect: 4 / 5, aspectLabel: "4:5", recommended: { w: 1080, h: 1350 }, min: { w: 720, h: 900 }, variantWidths: [540, 1080], accepts: RASTER, label: "Afiche del evento" },
  news_cover: { aspect: 16 / 9, aspectLabel: "16:9", recommended: { w: 1600, h: 900 }, min: { w: 1200, h: 675 }, variantWidths: [400, 800, 1600], accepts: RASTER, label: "Portada de la noticia" },
  gallery: { aspect: null, aspectLabel: "Libre", recommended: { w: 2400, h: 2400 }, min: { w: 1200, h: 1200 }, variantWidths: [800, 1600, 2400], accepts: RASTER, label: "Foto de galería" },
  sponsor_logo: { aspect: null, box: 2, aspectLabel: "2:1", recommended: { w: 600, h: 300 }, min: { w: 300, h: 150 }, variantWidths: [300, 600], accepts: [...RASTER, "image/svg+xml"], label: "Logo del patrocinador" },
  og_image: { aspect: 1200 / 630, aspectLabel: "1.91:1", recommended: { w: 1200, h: 630 }, min: { w: 1200, h: 630 }, variantWidths: [1200], accepts: RASTER, label: "Imagen para compartir" },
};

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Tope de píxeles al decodificar (≈ foto de 48 MP): un PNG chico puede declarar dimensiones enormes y agotar la memoria. */
export const MAX_INPUT_PIXELS = 50_000_000;

export function isMediaKind(value: string): value is MediaKind {
  return (MEDIA_KINDS as readonly string[]).includes(value);
}

/** Only event posters and mobile covers share the same crop, resolution and variants. */
export function isMediaKindCompatible(actual: MediaKind | undefined, expected: MediaKind): boolean {
  if (actual === expected) return true;
  return (actual === "event_poster" && expected === "event_hero_mobile") || (actual === "event_hero_mobile" && expected === "event_poster");
}

export function checkResolution(kind: MediaKind, w: number, h: number): { ok: boolean; warning?: string } {
  const spec = MEDIA_SPECS[kind];

  if (spec.aspect === null && spec.box === undefined) {
    if (Math.max(w, h) >= spec.min.w) return { ok: true };
    return {
      ok: false,
      warning: `La imagen es más chica que el mínimo recomendado (${spec.min.w} px de lado largo) y puede verse pixelada.`,
    };
  }

  // En una caja basta con llenar el ancho o el alto mínimo (un logo cuadrado llena el alto).
  const ok = spec.box !== undefined ? w >= spec.min.w || h >= spec.min.h : w >= spec.min.w && h >= spec.min.h;
  if (ok) return { ok: true };
  return {
    ok: false,
    warning: `La imagen es más chica que el mínimo recomendado (${spec.min.w}×${spec.min.h}) y puede verse pixelada.`,
  };
}

/** Nunca se escala hacia arriba; si el recorte es menor que todas las variantes, se usa su ancho. */
export function variantWidthsFor(kind: MediaKind, croppedWidth: number): number[] {
  const widths = MEDIA_SPECS[kind].variantWidths.filter((width) => width <= croppedWidth);
  return widths.length > 0 ? widths : [Math.max(1, Math.floor(croppedWidth))];
}

/** Ajusta un recorte a los límites de la imagen (el redondeo del editor puede pasarse por 1 px). */
export function clampCrop(crop: Crop, img: Size): Crop {
  const x = Math.min(Math.max(0, Math.round(crop.x)), img.w - 1);
  const y = Math.min(Math.max(0, Math.round(crop.y)), img.h - 1);
  const width = Math.max(1, Math.min(Math.round(crop.width), img.w - x));
  const height = Math.max(1, Math.min(Math.round(crop.height), img.h - y));
  return { x, y, width, height };
}

const FORMAT_NAMES: Record<string, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP", "image/avif": "AVIF", "image/svg+xml": "SVG" };

/** Formatos que la persona puede elegir. HEIC va donde se aceptan fotos: el navegador lo convierte a JPG antes de subirlo. */
export function formatsLabel(kind: MediaKind): string {
  const { accepts } = MEDIA_SPECS[kind];
  const names = accepts.filter((type) => type !== "image/svg+xml").map((type) => FORMAT_NAMES[type] ?? type);
  if (accepts.includes("image/jpeg")) names.push("HEIC");
  if (accepts.includes("image/svg+xml")) names.push("SVG");
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} o ${names.at(-1)}` : names.join("");
}

/** «vertical», «horizontal» o «cuadrada», para que la proporción se entienda sin hacer cuentas. */
function orientation(ratio: number): string {
  if (ratio === 1) return "cuadrada";
  return ratio < 1 ? "vertical" : "horizontal";
}

/** Lo que conviene subir en cada lugar: proporción (y su orientación), tamaño recomendado y mínimo en píxeles. */
export function describeSpec(kind: MediaKind): string {
  const { aspect, box, aspectLabel, recommended, min } = MEDIA_SPECS[kind];
  if (box !== undefined) {
    return `Proporción ${aspectLabel} (${orientation(box)}, se ve completo sin recortar) · Recomendado: ${recommended.w}×${recommended.h} px · Mínimo: ${min.w}×${min.h} px`;
  }
  if (aspect === null) {
    return `Proporción libre · Recomendado: ${recommended.w} px por el lado más largo · Mínimo: ${min.w} px`;
  }
  return `Proporción ${aspectLabel} (${orientation(aspect)}) · Recomendado: ${recommended.w}×${recommended.h} px · Mínimo: ${min.w}×${min.h} px`;
}
