import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db";
import type { Db } from "@/db";
import { addAllowedEmail } from "@/features/admin-users/allowlist";
import { user } from "@/db/schema/auth";
import { createAuthHooks } from "./auth-hooks";

async function insertUser(db: Db, id: string, email: string) {
  await db.insert(user).values({ id, name: email, email });
}

describe("auth hooks", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  describe("beforeUserCreate", () => {
    it("throws for an email outside the allowlist", async () => {
      const { beforeUserCreate } = createAuthHooks(db);

      await expect(beforeUserCreate({ email: "intruso@x.cl" })).rejects.toThrow();
    });

    it("does not throw for an allowed email", async () => {
      await addAllowedEmail(db, "admin@x.cl", null);
      const { beforeUserCreate } = createAuthHooks(db);

      await expect(beforeUserCreate({ email: "admin@x.cl" })).resolves.not.toThrow();
    });
  });

  describe("beforeSessionCreate", () => {
    it("throws when the session's user email is outside the allowlist", async () => {
      await insertUser(db, "user-1", "intruso@x.cl");
      const { beforeSessionCreate } = createAuthHooks(db);

      await expect(beforeSessionCreate({ userId: "user-1" })).rejects.toThrow();
    });

    it("does not throw when the session's user email is allowed", async () => {
      await addAllowedEmail(db, "admin@x.cl", null);
      await insertUser(db, "user-2", "admin@x.cl");
      const { beforeSessionCreate } = createAuthHooks(db);

      await expect(beforeSessionCreate({ userId: "user-2" })).resolves.not.toThrow();
    });
  });
});
