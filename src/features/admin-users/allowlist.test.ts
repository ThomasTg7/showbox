import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db";
import type { Db } from "@/db";
import { session, user } from "@/db/schema/auth";
import { addAllowedEmail, isEmailAllowed, normalizeEmail, removeAllowedEmail } from "./allowlist";

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases the email", () => {
    expect(normalizeEmail(" Admin@X.cl ")).toBe("admin@x.cl");
  });
});

describe("allowlist", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("allows an email that was added, regardless of case or whitespace", async () => {
    await addAllowedEmail(db, "Admin@X.cl", null);

    expect(await isEmailAllowed(db, " admin@x.cl ")).toBe(true);
  });

  it("reports whether the email was newly added", async () => {
    expect(await addAllowedEmail(db, "admin@x.cl", null)).toBe(true);
    expect(await addAllowedEmail(db, " ADMIN@x.cl", null)).toBe(false);
  });

  it("does not allow an email that was never added", async () => {
    expect(await isEmailAllowed(db, "nadie@x.cl")).toBe(false);
  });

  it("refuses to remove the last allowed email", async () => {
    await addAllowedEmail(db, "unico@x.cl", null);

    await expect(removeAllowedEmail(db, "unico@x.cl")).rejects.toThrow("No se puede quitar el último administrador");
  });

  it("revokes the removed admin's open sessions", async () => {
    await addAllowedEmail(db, "queda@x.cl", null);
    await addAllowedEmail(db, "sale@x.cl", null);
    await db.insert(user).values({ id: "u-sale", name: "sale", email: "sale@x.cl" });
    await db.insert(session).values({
      id: "s-1",
      token: "t-1",
      userId: "u-sale",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await removeAllowedEmail(db, "Sale@x.cl");

    expect(await isEmailAllowed(db, "sale@x.cl")).toBe(false);
    expect(await db.select().from(session).where(eq(session.userId, "u-sale"))).toEqual([]);
  });
});
