"use client";

import { useEffect, useRef, useState } from "react";
import type { Crop } from "@/domain/media-specs";
import { renderCropPreview } from "../crop-preview";

const DEBOUNCE_MS = 150;

/**
 * URL de una miniatura con el recorte aplicado. Mientras se calcula (o si el
 * navegador no puede, p. ej. bucket sin CORS) devuelve la imagen original.
 */
export function useCropPreview(src: string, crop: Crop | null, rotation: number): string {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const currentUrl = useRef<string | null>(null);
  const x = crop?.x;
  const y = crop?.y;
  const width = crop?.width;
  const height = crop?.height;

  useEffect(() => {
    if (x === undefined || y === undefined || !width || !height) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const blob = await renderCropPreview(src, { x, y, width, height }, rotation);
        if (!blob || cancelled) return;
        const url = URL.createObjectURL(blob);
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = url;
        setPreviewUrl(url);
      } catch {
        // Sin vista previa recortada: se muestra la imagen completa.
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [src, x, y, width, height, rotation]);

  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [],
  );

  return previewUrl ?? src;
}
