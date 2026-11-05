"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { formValues, zodFieldErrors, type FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { WRONG_CURRENT_PASSWORD, changeMyPassword, updateMyName } from "./my-account";
import { myNameSchema, myPasswordSchema } from "./my-account-schema";

export async function updateMyNameAction(_previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = myNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error), values: formValues(formData) };

  return runFormAction(
    "updateMyName",
    async () => {
      await updateMyName(db, admin.userId, parsed.data.name);
      revalidatePath("/admin/cuenta");
      return { success: "Nombre guardado" };
    },
    formData,
  );
}

export async function changeMyPasswordAction(_previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = myPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? undefined,
    newPassword: formData.get("newPassword"),
    confirmation: formData.get("confirmation"),
  });
  // Las contraseñas nunca se devuelven al formulario.
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const current = await auth.api.getSession({ headers: await headers() });
  const result = await runFormAction("changeMyPassword", async () => {
    await changeMyPassword(auth, db, {
      userId: admin.userId,
      sessionToken: current?.session.token ?? "",
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
    revalidatePath("/admin/cuenta");
    return { success: "Contraseña guardada. Cerramos tu sesión en los demás dispositivos." };
  });
  // El error de la contraseña actual va junto a su campo.
  return result.error === WRONG_CURRENT_PASSWORD ? { fieldErrors: { currentPassword: WRONG_CURRENT_PASSWORD } } : result;
}
