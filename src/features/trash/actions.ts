"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { requireAdmin } from "@/lib/require-admin";
import { UserFacingError } from "@/lib/user-facing-error";
import { TRASHABLE_ENTITIES } from "./registry";
import { restore } from "./trash";

const restoreSchema = z.object({
  entityType: z.string().min(1),
  id: z.string().min(1),
});

export async function restoreAction(entityType: string, id: string): Promise<{ error?: string }> {
  const admin = await requireAdmin();

  const parsed = restoreSchema.safeParse({ entityType, id });
  if (!parsed.success) {
    return { error: "Datos inválidos" };
  }

  try {
    await restore(db, parsed.data.entityType, parsed.data.id, admin.userId);
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    console.error("Error al restaurar", error);
    return { error: "No se pudo restaurar. Inténtalo de nuevo." };
  }

  TRASHABLE_ENTITIES.find((entity) => entity.type === parsed.data.entityType)?.revalidate?.(parsed.data.id);
  revalidatePath("/admin/papelera");
  return {};
}
