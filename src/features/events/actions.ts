"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { createPreviewToken } from "@/features/publication/preview";
import { publicationInputSchema } from "@/features/publication/schema";
import { formList, formValues, zodFieldErrors, type FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { adminPath, publicUrl } from "@/lib/site-urls";
import { getEventSlug } from "./admin-queries";
import { revalidateEvent } from "./cache";
import { eventIdSchema, eventInputSchema } from "./schema";
import { withEventRevalidation } from "./revalidate";
import { createEvent, deleteEvent, duplicateEvent, setEventPublication, updateEvent } from "./service";

/** Carpeta del listado en `src/app` (para `revalidatePath`); en el navegador es `adminPath("/eventos")`. */
const ADMIN_PATH = "/admin/eventos";
const NOT_FOUND: FormActionState = { error: "No se encontró el evento" };

const isEventId = (id: unknown): id is string => eventIdSchema.safeParse(id).success;

const run = (task: () => Promise<FormActionState | void>, formData?: FormData) => runFormAction("Error en eventos", task, formData);

/** Lo escrito en el formulario; la galería llega como un campo repetido (un id por foto, en el orden mostrado). */
function eventValues(formData: FormData) {
  return { ...formValues(formData), galleryMediaIds: formList(formData, "galleryMediaIds") };
}

/** Valida en el servidor para devolver un error por campo; el servicio vuelve a validar. */
function invalidForm(formData: FormData): FormActionState | null {
  const parsed = eventInputSchema.safeParse(eventValues(formData));
  return parsed.success ? null : { fieldErrors: zodFieldErrors(parsed.error), values: formValues(formData) };
}

export async function createEventAction(_previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();
  const invalid = invalidForm(formData);
  if (invalid) return invalid;

  let createdId: string | undefined;
  const result = await run(async () => {
    const created = await createEvent(db, eventValues(formData), admin.userId);
    createdId = created.id;
    revalidateEvent(created.id);
    revalidatePath(ADMIN_PATH);
  }, formData);
  return createdId ? { redirectTo: adminPath(`/eventos/${createdId}?creado=1`) } : result;
}

export async function updateEventAction(id: string, _previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isEventId(id)) return NOT_FOUND;
  const invalid = invalidForm(formData);
  if (invalid) return invalid;

  return run(async () => {
    await withEventRevalidation(id, () => updateEvent(db, id, eventValues(formData), admin.userId));
    revalidatePath(ADMIN_PATH);
    return { success: "Cambios guardados" };
  }, formData);
}

export async function setEventPublicationAction(id: string, input: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isEventId(id)) return NOT_FOUND;
  const parsed = publicationInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  return run(async () => {
    await withEventRevalidation(id, () => setEventPublication(db, id, parsed.data, admin.userId));
    revalidatePath(ADMIN_PATH);
    return { success: parsed.data.status === "published" ? "Evento publicado" : "Publicación actualizada" };
  });
}

export async function deleteEventAction(id: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isEventId(id)) return NOT_FOUND;

  return run(async () => {
    await withEventRevalidation(id, () => deleteEvent(db, id, admin.userId));
    revalidatePath(ADMIN_PATH);
    revalidatePath("/admin/papelera");
    return { success: "Enviado a la papelera" };
  });
}

/** Copia el evento como borrador y lleva a la persona a editar la copia. */
export async function duplicateEventAction(id: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isEventId(id)) return NOT_FOUND;

  return run(async () => {
    const copy = await duplicateEvent(db, id, admin.userId);
    revalidateEvent(copy.id);
    revalidatePath(ADMIN_PATH);
    return { success: "Evento duplicado", redirectTo: adminPath(`/eventos/${copy.id}?creado=1`) };
  });
}

/** Enlace de vista previa del evento (borrador incluido), válido 1 hora. Se pide al hacer clic para que no caduque. */
export async function createEventPreviewLinkAction(id: string): Promise<string | null> {
  await requireAdmin();
  if (!isEventId(id)) return null;
  const slug = await getEventSlug(db, id);
  // Absoluto: el panel está en otro dominio que la página pública.
  return slug ? publicUrl(`/eventos/${slug}?preview=${createPreviewToken("event", id)}`) : null;
}
