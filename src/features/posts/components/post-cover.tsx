import { MediaImage } from "@/components/media/media-image";
import { cn } from "@/lib/cn";
import { BRAND } from "@/domain/brand";
import type { MediaDTO } from "@/features/media/dto";

type PostCoverProps = {
  cover: MediaDTO | null;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** Portada 16:9 de una noticia. Sin portada, un fondo de la marca (nunca una imagen rota ni un hueco). */
export function PostCover({ cover, sizes, priority = false, className }: PostCoverProps) {
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,#3a0d0c,#0b0b0b_70%)]", className)}>
      {cover ? (
        <MediaImage
          media={cover}
          sizes={sizes}
          priority={priority}
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-sb motion-safe:group-hover:scale-105"
        />
      ) : (
        <div aria-hidden data-slot="post-cover-fallback" className="absolute inset-0 grid place-items-center">
          <span className="font-display text-[clamp(72px,16vw,160px)] leading-none text-transparent [-webkit-text-stroke:2px_rgba(255,59,71,.45)]">{BRAND.shortName}</span>
        </div>
      )}
    </div>
  );
}
