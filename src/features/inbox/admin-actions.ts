"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import type { FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { inboxIdSchema, inboxStatusSchema } from "./schema";
import { INBOX_STATUS_LABELS, setInboxStatus } from "./service";

/** Marca un mensaje como nuevo, contactado o descartado. */
export async function setInboxStatusAction(id: unknown, status: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsedId = inboxIdSchema.safeParse(id);
  const parsedStatus = inboxStatusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return { error: "No se encontró el mensaje" };

  return runFormAction("Error en la bandeja", async () => {
    await setInboxStatus(db, parsedId.data, parsedStatus.data, admin.userId);
    // El aviso de «nuevos» de la barra lateral vive en el layout: se refresca todo el panel.
    revalidatePath("/admin", "layout");
    return { success: `Marcado como ${INBOX_STATUS_LABELS[parsedStatus.data]}` };
  });
}
