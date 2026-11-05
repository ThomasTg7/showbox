import { PhotoGallery } from "@/components/media/photo-gallery";
import type { MediaDTO } from "@/features/media/dto";

/** Galería de fotos del boxeador (spec §3), debajo de sus datos. Solo se muestra si tiene fotos. */
export function FighterGallery({ media, name }: { media: MediaDTO[]; name: string }) {
  if (media.length === 0) return null;

  return (
    <section aria-labelledby="fighter-gallery-heading" data-slot="fighter-gallery" className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] pb-12 lg:pb-16">
      <h2 id="fighter-gallery-heading" className="mb-6 font-display text-[clamp(32px,5vw,56px)] uppercase leading-none text-white">
        Galería
      </h2>
      <PhotoGallery media={media} title={`Galería de ${name}`} />
    </section>
  );
}
