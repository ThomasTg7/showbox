import type { Crop } from "@/domain/media-specs";

const PREVIEW_MAX_WIDTH = 800;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Necesario para que el canvas no quede "contaminado" cuando la imagen viene del bucket (requiere CORS).
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    image.src = src;
  });
}

/** Dibuja solo la zona recortada (y girada) en pequeño para las vistas previas. `crop` está en píxeles de la imagen ya girada. */
export async function renderCropPreview(src: string, crop: Crop, rotation: number): Promise<Blob | null> {
  const image = await loadImage(src);
  const scale = Math.min(1, PREVIEW_MAX_WIDTH / crop.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));

  const context = canvas.getContext("2d");
  if (!context) return null;

  const sideways = rotation % 180 !== 0;
  const rotatedWidth = sideways ? image.naturalHeight : image.naturalWidth;
  const rotatedHeight = sideways ? image.naturalWidth : image.naturalHeight;

  context.scale(scale, scale);
  context.translate(-crop.x, -crop.y);
  context.translate(rotatedWidth / 2, rotatedHeight / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
}
