import { and, eq, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { account, session, user } from "@/db/schema/auth";
import { logAudit } from "@/features/audit/log";
import type { Auth } from "@/lib/create-auth";
import { UserFacingError } from "@/lib/user-facing-error";
import { NAME_MAX_LENGTH } from "./my-account-limits";
import { ADMIN_PASSWORD_MIN_LENGTH } from "./password-policy";

export const WRONG_CURRENT_PASSWORD = "La contraseña actual no es correcta";

export type MyAccount = { name: string; email: string; hasPassword: boolean; hasGoogle: boolean };

/** Lo que muestra «Mi cuenta»: nombre, correo y con qué puede entrar (contraseña, Google). */
export async function getMyAccount(db: Db, userId: string): Promise<MyAccount | null> {
  const [row] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (!row) return null;
  const providers = (await db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, userId))).map((linked) => linked.providerId);
  return { ...row, hasPassword: providers.includes("credential"), hasGoogle: providers.includes("google") };
}

export async function updateMyName(db: Db, userId: string, name: string): Promise<void> {
  const cleaned = name.trim();
  if (!cleaned) throw new UserFacingError("Escribe tu nombre");
  if (cleaned.length > NAME_MAX_LENGTH) throw new UserFacingError(`El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres`);

  await db.update(user).set({ name: cleaned, updatedAt: new Date() }).where(eq(user.id, userId));
  await logAudit(db, { actorId: userId, action: "update", entityType: "user", entityId: userId, summary: `Cambió su nombre a «${cleaned}»` });
}

export type ChangePasswordInput = {
  userId: string;
  /** La sesión desde la que se cambia: queda abierta; las demás se cierran. */
  sessionToken: string;
  /** Obligatoria si ya tiene contraseña; quien solo entra con Google la crea sin ella. */
  currentPassword?: string;
  newPassword: string;
};

/**
 * Cambia (o crea, si solo entraba con Google) la contraseña. Pide la actual cuando existe y cierra las otras sesiones:
 * si alguien más conocía la contraseña vieja, queda fuera.
 */
export async function changeMyPassword(auth: Auth, db: Db, input: ChangePasswordInput): Promise<void> {
  if (input.newPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new UserFacingError(`La contraseña nueva debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres`);
  }

  const context = await auth.$context;
  const [credential] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, input.userId), eq(account.providerId, "credential")))
    .limit(1);

  const hashed = await context.password.hash(input.newPassword);
  if (credential?.password) {
    const matches = await context.password.verify({ hash: credential.password, password: input.currentPassword ?? "" });
    if (!matches) throw new UserFacingError(WRONG_CURRENT_PASSWORD);
    await context.internalAdapter.updatePassword(input.userId, hashed);
  } else {
    await context.internalAdapter.createAccount({ userId: input.userId, providerId: "credential", accountId: input.userId, password: hashed });
  }

  await db.delete(session).where(and(eq(session.userId, input.userId), ne(session.token, input.sessionToken)));
  await logAudit(db, {
    actorId: input.userId,
    action: "update",
    entityType: "user",
    entityId: input.userId,
    summary: credential ? "Cambió su contraseña" : "Creó su contraseña",
  });
}
