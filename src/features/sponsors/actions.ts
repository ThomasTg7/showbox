"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { listAdminEvents } from "@/features/events/admin-queries";
import { softDelete } from "@/features/trash/trash";
import { formList, formValues, zodFieldErrors, type FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { revalidateSponsors } from "./cache";
import { reorderSponsorsSchema, sponsorIdSchema, sponsorInputSchema } from "./schema";
import { createSponsor, reorderSponsors, updateSponsor } from "./service";

const run = (task: () => Promise<FormActionState>, formData?: FormData) => runFormAction("Error en patrocinadores", task, formData);

/** Expira lo público (home, eventos, footer) y refresca la lista del panel. */
function refresh(): void {
  revalidateSponsors();
  revalidatePath("/admin/patrocinadores");
}

/** Crea (`id` nulo) o edita un patrocinador desde el diálogo del panel. */
export async function saveSponsorAction(id: string | null, formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (id !== null && !sponsorIdSchema.safeParse(id).success) return { error: "No se encontró el patrocinador" };

  const input = { ...formValues(formData), eventIds: formList(formData, "eventIds") };
  const parsed = sponsorInputSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error), values: formValues(formData) };

  return run(async () => {
    if (id === null) await createSponsor(db, input, admin.userId);
    else await updateSponsor(db, id, input, admin.userId);
    refresh();
    return { success: id === null ? "Patrocinador creado" : "Cambios guardados" };
  }, formData);
}

export async function reorderSponsorsAction(tier: unknown, orderedIds: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = reorderSponsorsSchema.safeParse({ tier, orderedIds });
  if (!parsed.success) return { error: "Datos inválidos" };

  return run(async () => {
    await reorderSponsors(db, parsed.data.tier, parsed.data.orderedIds, admin.userId);
    refresh();
    return { success: "Orden guardado" };
  });
}

/** Envía el patrocinador a la papelera (se puede restaurar 30 días). */
export async function deleteSponsorAction(id: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = sponsorIdSchema.safeParse(id);
  if (!parsed.success) return { error: "No se encontró el patrocinador" };

  return run(async () => {
    await softDelete(db, "sponsor", parsed.data, admin.userId);
    refresh();
    return { success: "Patrocinador enviado a la papelera" };
  });
}

const SEARCH_RESULTS = 10;

export type SponsorEventSearchResult = { id: string; name: string };

/** Buscador de eventos del patrocinador: hasta 10 por nombre (sin traer todos al navegador). */
export async function searchEventsForSponsorAction(query: string): Promise<SponsorEventSearchResult[]> {
  await requireAdmin();
  const text = typeof query === "string" ? query.trim().slice(0, 60) : "";
  if (text.length < 2) return [];
  const { items } = await listAdminEvents(db, { q: text }, { pageSize: SEARCH_RESULTS });
  return items.map((event) => ({ id: event.id, name: event.name }));
}
