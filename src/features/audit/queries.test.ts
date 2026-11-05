import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { user } from "@/db/schema/auth";
import { listAuditLog } from "./queries";

describe("listAuditLog", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await db.insert(user).values({ id: "u-1", name: "Admin", email: "admin@x.cl" });
    const base = Date.now();
    await db.insert(auditLog).values([
      { actorId: "u-1", action: "create", entityType: "e", entityId: "1", summary: "primera", createdAt: new Date(base - 3000) },
      { actorId: "system", action: "delete", entityType: "e", entityId: "2", summary: "segunda", createdAt: new Date(base - 2000) },
      { actorId: "u-1", action: "update", entityType: "e", entityId: "3", summary: "tercera", createdAt: new Date(base - 1000) },
    ]);
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("returns entries newest first with the actor's email when it is a user", async () => {
    const { entries, hasMore } = await listAuditLog(db);

    expect(hasMore).toBe(false);
    expect(entries.map((entry) => [entry.summary, entry.actorEmail])).toEqual([
      ["tercera", "admin@x.cl"],
      ["segunda", null],
      ["primera", "admin@x.cl"],
    ]);
  });

  it("paginates", async () => {
    const first = await listAuditLog(db, { page: 1, pageSize: 2 });
    const second = await listAuditLog(db, { page: 2, pageSize: 2 });

    expect(first.entries.map((entry) => entry.summary)).toEqual(["tercera", "segunda"]);
    expect(first.hasMore).toBe(true);
    expect(second.entries.map((entry) => entry.summary)).toEqual(["primera"]);
    expect(second.hasMore).toBe(false);
  });
});
