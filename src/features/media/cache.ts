/**
 * Tag de caché de una imagen. Las lecturas públicas cacheadas que devuelven un `MediaDTO` agregan el tag
 * de cada imagen (además del de su entidad): al reeditarla, las variantes viejas se borran y la página
 * debe volver a generarse con las nuevas URLs aunque la entidad no se haya guardado.
 */
export function mediaCacheTag(mediaId: string): string {
  return `media:${mediaId}`;
}

/**
 * Etiqueta general de imágenes: los listados cacheados (muchas imágenes, ids desconocidos de antemano) la llevan
 * y `saveMediaEditAction` la invalida junto con la de la imagen editada.
 */
export const MEDIA_ANY_TAG = "media";
