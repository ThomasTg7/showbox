import type { PostBody } from "@/domain/post-body";
import type { MediaDTO } from "@/features/media/dto";

// Todo lo que pasa por `unstable_cache` se serializa en JSON: las fechas viajan como texto ISO, nunca como `Date`.

export type PostCategoryDTO = { id: string; slug: string; name: string };

/** Lo que necesitan los listados, la home y los carruseles de la ficha y del evento. */
export type PostCardDTO = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: { slug: string; name: string };
  featured: boolean;
  /** Fecha de la noticia (`publish_at` o, si no hay, la de creación), en ISO. */
  date: string;
  /** Sin portada la tarjeta usa un fondo de marca. */
  cover: MediaDTO | null;
};

export type PostFighterDTO = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  nationality: string;
  /** Las dos fotos: la miniatura prefiere el rostro y, sin él, usa la de cuerpo. */
  headshotMedia: MediaDTO | null;
  bodyMedia: MediaDTO | null;
};

export type PostEventDTO = { id: string; slug: string; name: string; startsAt: string };

export type PostDTO = PostCardDTO & {
  /** Último cambio de la noticia, en ISO (`dateModified` de los datos estructurados). */
  updatedAt: string;
  body: PostBody;
  gallery: MediaDTO[];
  /** Imágenes que aparecen dentro del cuerpo, por id (las lee el renderer sin más consultas). */
  bodyMedia: Record<string, MediaDTO>;
  /** Solo boxeadores y eventos públicos ahora: uno en la papelera o en borrador no se muestra. */
  fighters: PostFighterDTO[];
  events: PostEventDTO[];
};

export type AdminPostRow = {
  id: string;
  slug: string;
  title: string;
  category: { slug: string; name: string };
  featured: boolean;
  status: "draft" | "scheduled" | "published";
  publishAt: Date | null;
  updatedAt: Date;
  cover: MediaDTO | null;
};

/** Una relación del formulario: el nombre ya armado y si hoy se vería en el sitio. */
export type RelatedItemDTO = { id: string; label: string; isPublic: boolean };

export type CategoryRow = PostCategoryDTO & { sortOrder: number; postCount: number };
