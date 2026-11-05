import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { session, user } from "@/db/schema/auth";
import { createRecordingMailer, createTestAuth } from "@/test/auth";
import { createTestDb } from "@/test/db";
import { createAdminWithPassword } from "./accounts";
import { addAllowedEmail } from "./allowlist";
import { changeMyPassword, getMyAccount, updateMyName } from "./my-account";

const PASSWORD = "Password123!";
const NEW_PASSWORD = "OtraClave456!";

describe("my account", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;
  let auth: ReturnType<typeof createTestAuth>;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    auth = createTestAuth(db, createRecordingMailer());
  });

  afterEach(async () => {
    await testDb.close();
  });

  async function adminWithPassword() {
    await createAdminWithPassword(auth, db, "admin@x.cl", PASSWORD);
    const signedIn = await auth.api.signInEmail({ body: { email: "admin@x.cl", password: PASSWORD } });
    return { userId: signedIn.user.id, sessionToken: signedIn.token };
  }

  /** Un admin que entró solo con Google: tiene usuario, pero no contraseña. */
  async function googleOnlyAdmin() {
    await addAllowedEmail(db, "google@x.cl", null);
    const context = await auth.$context;
    const created = await context.internalAdapter.createUser({ email: "google@x.cl", name: "Google Admin", emailVerified: true }, { method: "admin" });
    await context.internalAdapter.createAccount({ userId: created.id, providerId: "google", accountId: "google-123" });
    return created.id;
  }

  it("shows the name, the email and how the admin signs in", async () => {
    const { userId } = await adminWithPassword();
    expect(await getMyAccount(db, userId)).toEqual({ name: "admin@x.cl", email: "admin@x.cl", hasPassword: true, hasGoogle: false });

    const googleId = await googleOnlyAdmin();
    expect(await getMyAccount(db, googleId)).toMatchObject({ hasPassword: false, hasGoogle: true });
  });

  it("changes the name and audits it, refusing an empty one", async () => {
    const { userId } = await adminWithPassword();
    await updateMyName(db, userId, "  Rodrigo Campal  ");
    expect((await getMyAccount(db, userId))!.name).toBe("Rodrigo Campal");
    expect((await db.select().from(auditLog).where(eq(auditLog.entityId, userId))).map((row) => row.summary)).toContain("Cambió su nombre a «Rodrigo Campal»");

    await expect(updateMyName(db, userId, "   ")).rejects.toThrow("Escribe tu nombre");
  });

  it("changes the password with the current one, closes the other sessions and keeps this one", async () => {
    const { userId, sessionToken } = await adminWithPassword();
    const other = await auth.api.signInEmail({ body: { email: "admin@x.cl", password: PASSWORD } });

    await changeMyPassword(auth, db, { userId, sessionToken, currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

    await expect(auth.api.signInEmail({ body: { email: "admin@x.cl", password: PASSWORD } })).rejects.toThrow();
    await expect(auth.api.signInEmail({ body: { email: "admin@x.cl", password: NEW_PASSWORD } })).resolves.toBeDefined();
    const tokens = (await db.select({ token: session.token }).from(session).where(eq(session.userId, userId))).map((row) => row.token);
    expect(tokens).toContain(sessionToken);
    expect(tokens).not.toContain(other.token);
    expect((await db.select().from(auditLog).where(eq(auditLog.entityId, userId))).map((row) => row.summary)).toContain("Cambió su contraseña");
  });

  it("refuses a wrong current password or a short new one, without changing anything", async () => {
    const { userId, sessionToken } = await adminWithPassword();
    await expect(changeMyPassword(auth, db, { userId, sessionToken, currentPassword: "equivocada", newPassword: NEW_PASSWORD })).rejects.toThrow(
      "La contraseña actual no es correcta",
    );
    await expect(changeMyPassword(auth, db, { userId, sessionToken, currentPassword: PASSWORD, newPassword: "corta" })).rejects.toThrow("al menos 8");
    await expect(auth.api.signInEmail({ body: { email: "admin@x.cl", password: PASSWORD } })).resolves.toBeDefined();
  });

  it("lets an admin who only uses Google create a password without a current one", async () => {
    const userId = await googleOnlyAdmin();
    await changeMyPassword(auth, db, { userId, sessionToken: "", newPassword: NEW_PASSWORD });

    expect((await getMyAccount(db, userId))!.hasPassword).toBe(true);
    await expect(auth.api.signInEmail({ body: { email: "google@x.cl", password: NEW_PASSWORD } })).resolves.toBeDefined();
    expect((await db.select().from(user).where(eq(user.id, userId)))[0]!.email).toBe("google@x.cl");
  });
});
