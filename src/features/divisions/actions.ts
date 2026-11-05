"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { formValues, zodFieldErrors, type FormActionState } from "@/lib/form-errors";
import { DIVISIONS_CACHE_TAG } from "./cache";
import { requireAdmin } from "@/lib/require-admin";
import { runUserFacing } from "@/lib/user-facing-error";
import { divisionInputSchema, reorderDivisionsSchema, toggleDivisionSchema } from "./schema";
import { reorderDivisions, saveDivision, toggleDivision } from "./service";

/** Carpeta en `src/app` (para `revalidatePath`). */
const ADMIN_PATH = "/admin/divisiones";

async function run(task: () => Promise<string>): Promise<FormActionState> {
  const result = await runUserFacing("Error en divisiones", task);
  if ("error" in result) return result;
  revalidatePath(ADMIN_PATH);
  // Tarjetas, fichas y filtros públicos muestran el nombre y el peso de la división.
  updateTag(DIVISIONS_CACHE_TAG);
  return { success: result.value };
}

export async function saveDivisionAction(formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();

  const parsed = divisionInputSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    gender: formData.get("gender"),
    limitKg: formData.get("limitKg") ? Number(formData.get("limitKg")) : undefined,
    rankingSlots: formData.get("rankingSlots") ? Number(formData.get("rankingSlots")) : undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error), values: formValues(formData) };
  }

  const result = await run(async () => {
    await saveDivision(db, parsed.data, admin.userId);
    return "División guardada";
  });
  return result.error ? { ...result, values: formValues(formData) } : result;
}

export async function toggleDivisionAction(id: string, active: boolean): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = toggleDivisionSchema.safeParse({ id, active });
  if (!parsed.success) return { error: "Datos inválidos" };

  return run(async () => {
    await toggleDivision(db, parsed.data.id, parsed.data.active, admin.userId);
    return parsed.data.active ? "División activada" : "División desactivada";
  });
}

export async function reorderDivisionsAction(gender: string, orderedIds: string[]): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = reorderDivisionsSchema.safeParse({ gender, orderedIds });
  if (!parsed.success) return { error: "Datos inválidos" };

  return run(async () => {
    await reorderDivisions(db, parsed.data.gender, parsed.data.orderedIds, admin.userId);
    return "Orden guardado";
  });
}
