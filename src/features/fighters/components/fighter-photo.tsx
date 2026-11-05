import { MediaImage } from "@/components/media/media-image";
import { pickFighterPhoto, type FighterPhotos } from "@/domain/fighter-photo";
import type { MediaDTO } from "@/features/media/dto";
import { cn } from "@/lib/cn";
import { FighterSilhouette } from "./fighter-silhouette";

// Las fotos del boxeador en todo el sitio y el panel: cada lugar pide la que mejor le calza y, si no se subió, sale la
// otra; la silueta solo cuando no hay ninguna. Las dos llenan la caja de quien las usa (que pone tamaño, `relative` y
// `overflow-hidden`) y marcan con `data-photo` cuál salió.

type FighterPhotoProps = {
  fighter: FighterPhotos<MediaDTO>;
  sizes: string;
  /** Tamaño y posición de la silueta dentro de la caja (cambia según el fondo y el encuadre de cada lugar). */
  silhouetteClassName: string;
};

/** Miniatura del rostro (próxima pelea, historial, «En esta noticia», panel). Sin rostro, la foto de cuerpo desde arriba: se ve la cara. */
export function FighterFace({ fighter, sizes, silhouetteClassName }: FighterPhotoProps) {
  const photo = pickFighterPhoto(fighter, "headshot");
  return (
    <span data-photo={photo.kind} className="contents">
      {photo.media ? (
        <MediaImage media={photo.media} sizes={sizes} anchorTop={photo.kind === "body"} className="size-full object-cover" />
      ) : (
        <FighterSilhouette className={silhouetteClassName} />
      )}
    </span>
  );
}

type FighterFigureProps = FighterPhotoProps & {
  priority?: boolean;
  /** Cómo cae la foto de cuerpo (recortada, sin fondo) en la caja. */
  bodyFit?: string;
  /** Lo que se suma a la foto, salga la que salga (espejo, zoom al pasar el mouse, posición). */
  imageClassName?: string;
};

/** Figura del boxeador en tarjetas y portadas. Sin foto de cuerpo, la de rostro llenando el espacio. */
export function FighterFigure({ fighter, sizes, silhouetteClassName, priority = false, bodyFit = "object-contain object-bottom", imageClassName }: FighterFigureProps) {
  const photo = pickFighterPhoto(fighter, "body");
  return (
    <span data-photo={photo.kind} className="contents">
      {photo.media ? (
        <MediaImage media={photo.media} sizes={sizes} priority={priority} className={cn("size-full", photo.kind === "body" ? bodyFit : "object-cover", imageClassName)} />
      ) : (
        <FighterSilhouette className={silhouetteClassName} />
      )}
    </span>
  );
}
