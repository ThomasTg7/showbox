import { eq, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { createTrash } from "./trash";
import { handlePurge } from "./purge-handler";

const cronTestTable = pgTable("cron_purge_test", {
  id: text("id").primaryKey(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

const { purgeExpired } = createTrash([
  { type: "cron_test", label: "Prueba", table: cronTestTable, title: cronTestTable.id },
]);

function request(authorization?: string): Request {
  return new Request("http://localhost/api/cron/purge", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("GET /api/cron/purge", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;
  const originalSecret = process.env.CRON_SECRET;

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await db.execute(sql`create temporary table cron_purge_test (id text primary key, deleted_at timestamptz)`);
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterAll(async () => {
    process.env.CRON_SECRET = originalSecret;
    await testDb.close();
  });

  beforeEach(async () => {
    await db.execute(sql`delete from cron_purge_test`);
    await db.execute(sql`delete from audit_log`);
  });

  it("returns 401 when the Authorization header is missing", async () => {
    expect((await handlePurge(request(), { db, purgeExpired })).status).toBe(401);
  });

  it("returns 401 when the Authorization header has the wrong secret", async () => {
    expect((await handlePurge(request("Bearer wrong-secret"), { db, purgeExpired })).status).toBe(401);
  });

  it("purges, returns the count and records it in the audit log", async () => {
    await db.insert(cronTestTable).values({ id: "old", deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) });

    const response = await handlePurge(request("Bearer test-cron-secret"), { db, purgeExpired });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ purged: 1 });
    const logs = await db.select().from(auditLog).where(eq(auditLog.actorId, "system"));
    expect(logs).toEqual([expect.objectContaining({ action: "delete", entityType: "trash" })]);
  });

  it("does not add an audit entry when nothing was purged", async () => {
    await handlePurge(request("Bearer test-cron-secret"), { db, purgeExpired });

    expect(await db.select().from(auditLog)).toEqual([]);
  });

  it("also purges orphan media and records it when a purger is provided", async () => {
    const purgeOrphanMedia = async () => 3;

    const response = await handlePurge(request("Bearer test-cron-secret"), { db, purgeExpired, purgeOrphanMedia });

    await expect(response.json()).resolves.toEqual({ purged: 0, orphanMedia: 3 });
    const logs = await db.select().from(auditLog).where(eq(auditLog.actorId, "system"));
    expect(logs).toEqual([expect.objectContaining({ entityType: "media" })]);
  });

  it("also purges unreferenced media and audits it, keeping the other counts", async () => {
    const purgeUnreferencedMedia = async () => 4;

    const response = await handlePurge(request("Bearer test-cron-secret"), { db, purgeExpired, purgeUnreferencedMedia });

    await expect(response.json()).resolves.toEqual({ purged: 0, unreferencedMedia: 4 });
    const logs = await db.select().from(auditLog).where(eq(auditLog.actorId, "system"));
    expect(logs).toEqual([
      expect.objectContaining({ entityType: "media", summary: "Se eliminaron 4 imágenes que ya no se usaban" }),
    ]);
  });

  it("runs both media tasks when both are provided", async () => {
    const response = await handlePurge(request("Bearer test-cron-secret"), {
      db,
      purgeExpired,
      purgeOrphanMedia: async () => 1,
      purgeUnreferencedMedia: async () => 2,
    });

    await expect(response.json()).resolves.toEqual({ purged: 0, orphanMedia: 1, unreferencedMedia: 2 });
  });
});
