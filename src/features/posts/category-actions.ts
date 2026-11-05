"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import type { FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { revalidatePostCategories } from "./cache";
import { deleteCategory, reorderCategories, saveCategory } from "./categories-service";
import type { CategoryInput } from "./schema";

const NOT_FOUND: FormActionState = { error: "No se encontró la categoría" };

const run = (task: () => Promise<FormActionState | void>) => runFormAction("Error en las categorías de noticias", task);

/** Cambiar nombres u orden cambia las tarjetas y los filtros públicos, y los selectores del panel. */
function refresh(): void {
  revalidatePostCategories();
  revalidatePath("/admin/noticias", "layout");
}

export async function saveCategoryAction(input: CategoryInput): Promise<FormActionState> {
  const admin = await requireAdmin();
  return run(async () => {
    await saveCategory(db, input, admin.userId);
    refresh();
    return { success: "Categoría guardada" };
  });
}

export async function reorderCategoriesAction(ids: string[]): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = z.array(z.uuid()).safeParse(ids);
  if (!parsed.success) return { error: "La lista de categorías cambió: recarga la página e inténtalo de nuevo" };
  return run(async () => {
    await reorderCategories(db, parsed.data, admin.userId);
    refresh();
    return { success: "Orden guardado" };
  });
}

export async function deleteCategoryAction(id: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return NOT_FOUND;
  return run(async () => {
    await deleteCategory(db, id, admin.userId);
    refresh();
    return { success: "Categoría eliminada" };
  });
}
