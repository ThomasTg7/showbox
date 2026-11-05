import type { Db } from "@/db";
import type { Auth } from "@/lib/create-auth";
import { addAllowedEmail, normalizeEmail } from "./allowlist";
import { ADMIN_PASSWORD_MIN_LENGTH, PASSWORD_LINK_PATH } from "./password-policy";

export async function createAdminWithPassword(auth: Auth, db: Db, email: string, password: string): Promise<void> {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres`);
  }

  const normalized = normalizeEmail(email);
  await addAllowedEmail(db, normalized, null);

  const context = await auth.$context;
  const hashed = await context.password.hash(password);
  const existing = await context.internalAdapter.findUserByEmail(normalized, { includeAccounts: true });
  const adminUser =
    existing?.user ??
    (await context.internalAdapter.createUser({ email: normalized, name: normalized, emailVerified: true }, { method: "admin" }));

  if (existing?.accounts.some((linked) => linked.providerId === "credential")) {
    await context.internalAdapter.updatePassword(adminUser.id, hashed);
  } else {
    await context.internalAdapter.createAccount({
      userId: adminUser.id,
      providerId: "credential",
      accountId: adminUser.id,
      password: hashed,
    });
  }
}

export type InviteResult = "invited" | "already-allowed";

export async function inviteAdmin(auth: Auth, db: Db, email: string, actorId: string): Promise<InviteResult> {
  const normalized = normalizeEmail(email);
  if (!(await addAllowedEmail(db, normalized, actorId))) {
    return "already-allowed";
  }

  const context = await auth.$context;
  if (!(await context.internalAdapter.findUserByEmail(normalized))) {
    await context.internalAdapter.createUser({ email: normalized, name: normalized, emailVerified: false }, { method: "admin" });
  }

  // El mismo enlace de "restablecer contraseña" sirve para crearla la primera
  // vez: Better Auth crea la cuenta con contraseña si el usuario no tenía.
  await auth.api.requestPasswordReset({ body: { email: normalized, redirectTo: PASSWORD_LINK_PATH } });
  return "invited";
}
