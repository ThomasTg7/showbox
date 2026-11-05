import { PhotoGallery } from "@/components/media/photo-gallery";
import type { MediaDTO } from "@/features/media/dto";

/** Galería de fotos del evento (miniaturas con visor). */
export function EventGallery({ media, eventName }: { media: MediaDTO[]; eventName: string }) {
  return <PhotoGallery media={media} title={`Galería de ${eventName}`} />;
}
