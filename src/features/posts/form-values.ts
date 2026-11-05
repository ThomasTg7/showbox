import type { Post } from "@/db/schema/posts";

/** Los formularios HTML solo manejan texto: cada campo de la noticia como string (vacío = sin dato). */
export type PostFormValues = Record<string, string>;

export const EMPTY_POST_VALUES: PostFormValues = { title: "", slug: "", excerpt: "", categoryId: "" };

export function postToFormValues(post: Post): PostFormValues {
  return { title: post.title, slug: post.slug, excerpt: post.excerpt ?? "", categoryId: post.categoryId };
}

/** Pestaña donde vive cada campo: si falla la validación, el formulario abre la primera pestaña con error. */
export const POST_FIELD_TABS = {
  data: ["title", "slug", "categoryId", "featured", "excerpt", "coverMediaId"],
  text: ["body"],
  gallery: ["galleryMediaIds"],
  related: ["fighterIds", "eventIds"],
  publication: ["status", "publishAt"],
} as const;

export type PostTab = keyof typeof POST_FIELD_TABS;

export function tabForPostField(field: string): PostTab | null {
  for (const [tab, fields] of Object.entries(POST_FIELD_TABS)) {
    if ((fields as readonly string[]).includes(field)) return tab as PostTab;
  }
  return null;
}
