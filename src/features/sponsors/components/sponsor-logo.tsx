import { MediaImage } from "@/components/media/media-image";
import { cn } from "@/lib/cn";
import type { SponsorDTO } from "../dto";

type SponsorLogoProps = {
  sponsor: SponsorDTO;
  /** Ancho real del logo en pantalla (`sizes` de la imagen). */
  sizes: string;
  /** Clases de la caja 2:1 (ancho). */
  className?: string;
  /** Logo en gris que toma su color al pasar el mouse o enfocarlo (la cinta); `false` lo deja a color. */
  muted?: boolean;
  /** Fuera del orden de tabulación (la copia oculta de la cinta). */
  decorative?: boolean;
};

/** Logo entero (nunca recortado) dentro de una caja 2:1; con enlace a la web del patrocinador si la tiene. */
export function SponsorLogo({ sponsor, sizes, className, muted = false, decorative = false }: SponsorLogoProps) {
  const image = (
    <span className={cn("block aspect-[2/1] w-full", muted && "grayscale opacity-70 transition duration-300 group-hover/logo:grayscale-0 group-hover/logo:opacity-100 group-focus-visible/logo:grayscale-0 group-focus-visible/logo:opacity-100")}>
      {/* Un logo sin texto alternativo se anuncia por el nombre del patrocinador. */}
      <MediaImage media={{ ...sponsor.logo, alt: sponsor.logo.alt || sponsor.name }} sizes={sizes} className="size-full object-contain" />
    </span>
  );

  if (!sponsor.url) return <span className={cn("block", className)}>{image}</span>;
  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={decorative ? undefined : `${sponsor.name} (se abre en otra pestaña)`}
      tabIndex={decorative ? -1 : undefined}
      className={cn("group/logo block outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-bright", className)}
    >
      {image}
    </a>
  );
}
