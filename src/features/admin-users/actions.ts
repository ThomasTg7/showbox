"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { logAudit } from "@/features/audit/log";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-admin";
import { inviteAdmin } from "./accounts";
import { removeAllowedEmail } from "./allowlist";
import { allowedEmailSchema } from "./schema";

export type AllowedEmailActionState = { error?: string; success?: string };

export async function addAllowedEmailAction(formData: FormData): Promise<AllowedEmailActionState> {
  const admin = await requireAdmin();

  const parsed = allowedEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Correo inválido" };
  }
  const { email } = parsed.data;

  let result: Awaited<ReturnType<typeof inviteAdmin>>;
  try {
    result = await inviteAdmin(auth, db, email, admin.userId);
  } catch {
    // El correo ya quedó con acceso; lo que falló fue el envío de la invitación.
    await logAudit(db, {
      actorId: admin.userId,
      action: "create",
      entityType: "allowed_email",
      entityId: email,
      summary: `Se dio acceso a ${email} (no se pudo enviar la invitación)`,
    });
    revalidatePath("/admin/usuarios");
    return {
      error: `${email} ya tiene acceso, pero no pudimos enviarle el correo. Puede entrar con "¿Olvidaste tu contraseña?".`,
    };
  }

  if (result === "already-allowed") {
    return { error: "Ese correo ya tiene acceso al panel." };
  }

  await logAudit(db, {
    actorId: admin.userId,
    action: "create",
    entityType: "allowed_email",
    entityId: email,
    summary: `Se dio acceso a ${email} y se le envió la invitación`,
  });

  revalidatePath("/admin/usuarios");
  return { success: `Listo. Enviamos una invitación a ${email}.` };
}

export async function removeAllowedEmailAction(email: string): Promise<AllowedEmailActionState> {
  const admin = await requireAdmin();

  const parsed = allowedEmailSchema.safeParse({ email });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Correo inválido" };
  }
  if (parsed.data.email === admin.email.toLowerCase()) {
    return { error: "No puedes quitarte el acceso a ti mismo. Pídeselo a otro administrador." };
  }

  try {
    await removeAllowedEmail(db, parsed.data.email);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo quitar el correo" };
  }

  await logAudit(db, {
    actorId: admin.userId,
    action: "delete",
    entityType: "allowed_email",
    entityId: parsed.data.email,
    summary: `Se quitó el acceso a ${parsed.data.email}`,
  });

  revalidatePath("/admin/usuarios");
  return { success: `Listo. ${parsed.data.email} ya no tiene acceso.` };
}
