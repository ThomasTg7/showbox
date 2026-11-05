import type { MediaDTO } from "@/features/media/dto";

type MediaImageProps = {
  media: MediaDTO;
  /** Ancho real que ocupa la imagen en pantalla ("(min-width: 1024px) 400px, 50vw"). Obligatorio: sin él se descarga de más. */
  sizes: string;
  /** Solo la imagen LCP de cada página. */
  priority?: boolean;
  /** Muestra la parte de arriba de la foto (la cabeza en una foto de cuerpo) y respeta el enfoque solo en horizontal. */
  anchorTop?: boolean;
  className?: string;
};

/** Imagen responsiva con las variantes WebP; nunca sirve el original (salvo logos SVG). */
export function MediaImage({ media, sizes, priority = false, anchorTop = false, className }: MediaImageProps) {
  const largest = media.variants.at(-1);
  // Ancho y alto del resultado: el navegador reserva el espacio antes de cargar (sin saltos de diseño).
  const [width, height] = largest ? [largest.width, largest.height] : [media.width, media.height];
  const hasSize = Boolean(width && height);
  const srcSet = media.variants.map((variant) => `${variant.url} ${variant.width}w`).join(", ");

  return (
    // eslint-disable-next-line @next/next/no-img-element -- las variantes ya vienen optimizadas y recortadas; next/image las reprocesaría
    <img
      src={largest?.url ?? media.originalUrl}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={media.alt}
      width={hasSize ? width : undefined}
      height={hasSize ? height : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      style={{ objectPosition: `${media.focal.x * 100}% ${anchorTop ? 0 : media.focal.y * 100}%` }}
      className={className}
    />
  );
}
