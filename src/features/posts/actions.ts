"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { listAdminEvents } from "@/features/events/admin-queries";
import { createPreviewToken } from "@/features/publication/preview";
import { publicationInputSchema } from "@/features/publication/schema";
import { formList, formValues, zodFieldErrors, type FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { adminPath, publicUrl } from "@/lib/site-urls";
import { getPostSlug } from "./queries";
import { revalidateCreatedPost, revalidatePostsPanel, withPostRevalidation } from "./revalidate";
import { postIdSchema, postInputSchema } from "./schema";
import { createPost, deletePost, setPostPublication, updatePost } from "./service";

const NOT_FOUND: FormActionState = { error: "No se encontró la noticia" };

const isPostId = (id: unknown): id is string => postIdSchema.safeParse(id).success;

const run = (task: () => Promise<FormActionState | void>, formData?: FormData) => runFormAction("Error en noticias", task, formData);

/** Lo escrito en el formulario; galería y relaciones llegan como campos repetidos (un id por elemento, en el orden mostrado). */
function postValues(formData: FormData) {
  return {
    ...formValues(formData),
    galleryMediaIds: formList(formData, "galleryMediaIds"),
    fighterIds: formList(formData, "fighterIds"),
    eventIds: formList(formData, "eventIds"),
  };
}

/** Valida en el servidor para devolver un error por campo; el servicio vuelve a validar. */
function invalidForm(formData: FormData): FormActionState | null {
  const parsed = postInputSchema.safeParse(postValues(formData));
  return parsed.success ? null : { fieldErrors: zodFieldErrors(parsed.error), values: formValues(formData) };
}

export async function createPostAction(_previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();
  const invalid = invalidForm(formData);
  if (invalid) return invalid;

  let createdId: string | undefined;
  const result = await run(async () => {
    const created = await createPost(db, postValues(formData), admin.userId);
    createdId = created.id;
    await revalidateCreatedPost(created.id);
    revalidatePostsPanel();
  }, formData);
  return createdId ? { redirectTo: adminPath(`/noticias/${createdId}?creada=1`) } : result;
}

export async function updatePostAction(id: string, _previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isPostId(id)) return NOT_FOUND;
  const invalid = invalidForm(formData);
  if (invalid) return invalid;

  return run(async () => {
    await withPostRevalidation(id, () => updatePost(db, id, postValues(formData), admin.userId));
    revalidatePostsPanel();
    return { success: "Cambios guardados" };
  }, formData);
}

export async function setPostPublicationAction(id: string, input: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isPostId(id)) return NOT_FOUND;
  const parsed = publicationInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  return run(async () => {
    await withPostRevalidation(id, () => setPostPublication(db, id, parsed.data, admin.userId));
    revalidatePostsPanel();
    return { success: parsed.data.status === "published" ? "Noticia publicada" : "Publicación actualizada" };
  });
}

export async function deletePostAction(id: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isPostId(id)) return NOT_FOUND;

  return run(async () => {
    await withPostRevalidation(id, () => deletePost(db, id, admin.userId));
    revalidatePostsPanel();
    revalidatePath("/admin/papelera");
    return { success: "Enviada a la papelera" };
  });
}

/** Enlace de vista previa de la noticia (borrador incluido), válido 1 hora. Se pide al hacer clic para que no caduque. */
export async function createPostPreviewLinkAction(id: string): Promise<string | null> {
  await requireAdmin();
  if (!isPostId(id)) return null;
  const slug = await getPostSlug(db, id);
  // Absoluto: el panel está en otro dominio que la página pública.
  return slug ? publicUrl(`/noticias/${slug}?preview=${createPreviewToken("post", id)}`) : null;
}

const SEARCH_RESULTS = 10;

export type EventSearchResult = { id: string; name: string; status: "draft" | "scheduled" | "published" };

/** Buscador de eventos relacionados: hasta 10 por nombre (sin traer todos al navegador). */
export async function searchEventsForPostAction(query: string): Promise<EventSearchResult[]> {
  await requireAdmin();
  const text = typeof query === "string" ? query.trim().slice(0, 60) : "";
  if (text.length < 2) return [];
  const { items } = await listAdminEvents(db, { q: text }, { pageSize: SEARCH_RESULTS });
  return items.map((event) => ({ id: event.id, name: event.name, status: event.status }));
}
