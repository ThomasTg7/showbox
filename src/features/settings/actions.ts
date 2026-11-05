"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { formValues, type FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { revalidateSettings } from "./cache";
import { settingInputFromForm } from "./form-input";
import { isSettingKey } from "./registry";
import { saveSetting } from "./service";

/** Guarda un grupo de la configuración (`key` viene ligado al formulario de su pestaña). */
export async function saveSettingAction(key: string, _previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();
  if (!isSettingKey(key)) return { error: "No se encontró esta configuración" };

  return runFormAction(
    "Error al guardar la configuración",
    async () => {
      const result = await saveSetting(db, key, settingInputFromForm(key, formData), admin.userId);
      if (!result.ok) return { fieldErrors: result.errors, values: formValues(formData) };
      revalidateSettings();
      revalidatePath("/admin/configuracion");
      return { success: "Cambios guardados" };
    },
    formData,
  );
}
