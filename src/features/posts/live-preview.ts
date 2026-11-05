import { collectBodyMediaIds, type PostBody } from "@/domain/post-body";
import type { MediaDTO } from "@/features/media/dto";
import type { PublicationValue } from "@/features/publication/schedule";
import type { PostCategoryDTO, PostDTO } from "./dto";

// Vista previa en vivo del formulario: el panel arma la noticia con lo que hay escrito y la manda por `postMessage` a
// `/vista-previa-noticia` (mismo origen), que la dibuja con los mismos componentes del sitio.

export const LIVE_PREVIEW_MESSAGE = "gc:post-live-preview";
/** Lo manda la página de la vista previa al cargar: pide los datos actuales. */
export const LIVE_PREVIEW_READY = "gc:post-live-preview-ready";

export type LivePreviewMessage = { type: typeof LIVE_PREVIEW_MESSAGE; post: PostDTO };

export type LivePreviewInput = {
  title: string;
  excerpt: string;
  categoryId: string;
  categories: PostCategoryDTO[];
  cover: MediaDTO | null;
  gallery: MediaDTO[];
  body: PostBody;
  /** Imágenes conocidas por id (las del cuerpo y las subidas en el formulario). */
  media: Record<string, MediaDTO>;
  publication: PublicationValue;
  now: Date;
};

/** La noticia tal como se vería publicada. Boxeadores y eventos relacionados no se muestran (se ven al guardar). */
export function buildLivePreviewPost(input: LivePreviewInput): PostDTO {
  const category = input.categories.find((item) => item.id === input.categoryId);
  const date = input.publication.status === "scheduled" && input.publication.publishAt ? input.publication.publishAt : input.now;
  const bodyMedia = Object.fromEntries(collectBodyMediaIds(input.body).flatMap((id) => (input.media[id] ? [[id, input.media[id]]] : [])));
  return {
    id: "vista-previa",
    slug: "vista-previa",
    title: input.title.trim() || "Título de la noticia",
    excerpt: input.excerpt.trim() || null,
    category: category ? { slug: category.slug, name: category.name } : { slug: "", name: "Categoría" },
    featured: false,
    date: date.toISOString(),
    updatedAt: date.toISOString(),
    cover: input.cover,
    body: input.body,
    gallery: input.gallery,
    bodyMedia,
    fighters: [],
    events: [],
  };
}

export function isLivePreviewMessage(data: unknown): data is LivePreviewMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  return message.type === LIVE_PREVIEW_MESSAGE && typeof message.post === "object" && message.post !== null;
}
