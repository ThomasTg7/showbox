"use client";

import { MEDIA_SPECS } from "@/domain/media-specs";
import type { MediaDTO } from "@/features/media/dto";
import { MediaField } from "@/features/media/components/media-field";
import { MediaGalleryField } from "@/features/media/components/media-gallery-field";

type FighterPhotosTabProps = { bodyMedia: MediaDTO | null; headshotMedia: MediaDTO | null; gallery: MediaDTO[] };

export function FighterPhotosTab({ bodyMedia, headshotMedia, gallery }: FighterPhotosTabProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{MEDIA_SPECS.fighter_body.label}</h3>
          <p className="text-sm text-muted-foreground">
            Es la foto principal de la ficha y del listado. Lo ideal es un PNG sin fondo (puedes quitarlo en el editor).
          </p>
          <MediaField kind="fighter_body" name="bodyMediaId" media={bodyMedia} />
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{MEDIA_SPECS.fighter_headshot.label}</h3>
          <p className="text-sm text-muted-foreground">Se usa en cartelas y resultados.</p>
          <MediaField kind="fighter_headshot" name="headshotMediaId" media={headshotMedia} />
        </section>
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Galería</h3>
        <p className="text-sm text-muted-foreground">Más fotos del boxeador (se pueden ordenar). Aparecen al final de su ficha.</p>
        <MediaGalleryField name="galleryMediaIds" media={gallery} />
      </section>
    </div>
  );
}
