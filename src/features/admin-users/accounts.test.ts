import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { user } from "@/db/schema/auth";
import { createTestDb } from "@/test/db";
import { createRecordingMailer, createTestAuth, tokenFromResetUrl } from "@/test/auth";
import { createAdminWithPassword, inviteAdmin } from "./accounts";
import { addAllowedEmail, removeAllowedEmail } from "./allowlist";

const PASSWORD = "Password123!";

describe("admin accounts", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;
  let mailer: ReturnType<typeof createRecordingMailer>;
  let auth: ReturnType<typeof createTestAuth>;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    mailer = createRecordingMailer();
    auth = createTestAuth(db, mailer);
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("rejects public email sign-up even for an allowlisted email", async () => {
    await addAllowedEmail(db, "nuevo@x.cl", null);

    await expect(
      auth.api.signUpEmail({ body: { email: "nuevo@x.cl", password: PASSWORD, name: "Intruso" } }),
    ).rejects.toThrow();
    expect(await db.select().from(user)).toEqual([]);
  });

  it("creates an admin with a password that can sign in", async () => {
    await createAdminWithPassword(auth, db, " Admin@X.cl ", PASSWORD);

    const result = await auth.api.signInEmail({ body: { email: "admin@x.cl", password: PASSWORD } });
    expect(result.user.email).toBe("admin@x.cl");
  });

  it("replaces the password when the admin already exists", async () => {
    await createAdminWithPassword(auth, db, "admin@x.cl", PASSWORD);
    await createAdminWithPassword(auth, db, "admin@x.cl", "OtraClave456!");

    await expect(auth.api.signInEmail({ body: { email: "admin@x.cl", password: PASSWORD } })).rejects.toThrow();
    const result = await auth.api.signInEmail({ body: { email: "admin@x.cl", password: "OtraClave456!" } });
    expect(result.user.email).toBe("admin@x.cl");
  });

  it("invites a new admin by email and the link lets them set a password", async () => {
    await createAdminWithPassword(auth, db, "admin@x.cl", PASSWORD);

    expect(await inviteAdmin(auth, db, "Nuevo@x.cl", "actor-1")).toBe("invited");

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({ to: "nuevo@x.cl", props: { kind: "invitation" } });
    const token = tokenFromResetUrl(mailer.sent[0].props.url);
    await auth.api.resetPassword({ body: { newPassword: PASSWORD, token } });
    const result = await auth.api.signInEmail({ body: { email: "nuevo@x.cl", password: PASSWORD } });
    expect(result.user.email).toBe("nuevo@x.cl");
  });

  it("does not invite an email that already has access", async () => {
    await createAdminWithPassword(auth, db, "admin@x.cl", PASSWORD);

    expect(await inviteAdmin(auth, db, "admin@x.cl", "actor-1")).toBe("already-allowed");
    expect(mailer.sent).toEqual([]);
  });

  it("sends a reset email (not an invitation) to an admin who already has a password", async () => {
    await createAdminWithPassword(auth, db, "admin@x.cl", PASSWORD);

    await auth.api.requestPasswordReset({ body: { email: "admin@x.cl", redirectTo: "/admin/restablecer" } });

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({ to: "admin@x.cl", props: { kind: "reset" } });
  });

  it("sends nothing when a removed admin asks to reset the password", async () => {
    await createAdminWithPassword(auth, db, "queda@x.cl", PASSWORD);
    await createAdminWithPassword(auth, db, "sale@x.cl", PASSWORD);
    await removeAllowedEmail(db, "sale@x.cl");

    await auth.api.requestPasswordReset({ body: { email: "sale@x.cl", redirectTo: "/admin/restablecer" } });

    expect(mailer.sent).toEqual([]);
  });

  it("refuses sign-in for a removed admin with the EMAIL_NOT_ALLOWED code", async () => {
    await createAdminWithPassword(auth, db, "queda@x.cl", PASSWORD);
    await createAdminWithPassword(auth, db, "sale@x.cl", PASSWORD);
    await removeAllowedEmail(db, "sale@x.cl");

    await expect(
      auth.api.signInEmail({ body: { email: "sale@x.cl", password: PASSWORD } }),
    ).rejects.toMatchObject({ body: { code: "EMAIL_NOT_ALLOWED" } });
  });

  it("records each successful sign-in in the audit log", async () => {
    await createAdminWithPassword(auth, db, "admin@x.cl", PASSWORD);

    const { user: signedIn } = await auth.api.signInEmail({ body: { email: "admin@x.cl", password: PASSWORD } });

    const rows = await db.select().from(auditLog).where(eq(auditLog.action, "login"));
    expect(rows).toEqual([expect.objectContaining({ actorId: signedIn.id, entityType: "user" })]);
  });
});
