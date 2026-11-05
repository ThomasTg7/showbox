import { updateTag } from "next/cache";

/** Tag de los listados públicos de noticias (`/noticias`, home) y de los carruseles de fichas y eventos. */
export const POSTS_LIST_TAG = "posts";

export function postCacheTag(id: string): string {
  return `post:${id}`;
}

/**
 * Expira al instante la noticia y los listados donde aparece. Solo desde server actions: `updateTag` no sirve
 * contenido viejo ni una vez, y despublicar o enviar a la papelera debe ocultarla ya. Quien cambia las relaciones
 * invalida además las fichas y eventos relacionados (`withPostRevalidation`).
 */
export function revalidatePost(id: string): void {
  updateTag(postCacheTag(id));
  updateTag(POSTS_LIST_TAG);
}

/** Cambiar el nombre u orden de una categoría cambia las tarjetas de todas las noticias. */
export function revalidatePostCategories(): void {
  updateTag(POSTS_LIST_TAG);
}
