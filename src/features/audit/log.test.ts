import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { logAudit } from "./log";

describe("logAudit", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("inserts an audit_log row with the given entry", async () => {
    await logAudit(db, {
      actorId: "user-1",
      action: "create",
      entityType: "fighter",
      entityId: "fighter-1",
      summary: "Se creó el boxeador Cevallos",
    });

    const [row] = await db.select().from(auditLog).where(eq(auditLog.entityId, "fighter-1"));

    expect(row).toMatchObject({
      actorId: "user-1",
      action: "create",
      entityType: "fighter",
      entityId: "fighter-1",
      summary: "Se creó el boxeador Cevallos",
      diff: null,
    });
  });

  it("stores the optional diff as jsonb", async () => {
    await logAudit(db, {
      actorId: "user-1",
      action: "update",
      entityType: "fighter",
      entityId: "fighter-2",
      summary: "Se actualizó el peso",
      diff: { weightKg: { from: 70, to: 71 } },
    });

    const [row] = await db.select().from(auditLog).where(eq(auditLog.entityId, "fighter-2"));

    expect(row.diff).toEqual({ weightKg: { from: 70, to: 71 } });
  });
});
