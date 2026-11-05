import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { inboxMessages } from "@/db/schema/inbox";
import { UserFacingError } from "@/lib/user-facing-error";
import { createTestDb } from "@/test/db";
import { setInboxStatus } from "./service";

describe("setInboxStatus", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;
  let id: string;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    const [row] = await db
      .insert(inboxMessages)
      .values({ kind: "sponsorship", name: "Kaizen Fightwear", email: "ana@kaizen.example.cl", payload: { contactName: "Ana", message: null }, consentAt: new Date() })
      .returning({ id: inboxMessages.id });
    id = row!.id;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("changes the status and records who did it", async () => {
    await setInboxStatus(db, id, "contacted", "admin-1");

    const [row] = await db.select().from(inboxMessages).where(eq(inboxMessages.id, id));
    expect(row?.status).toBe("contacted");
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(entry).toMatchObject({ actorId: "admin-1", action: "update", entityType: "inbox" });
    expect(entry?.summary).toContain("Kaizen Fightwear");
    expect(entry?.summary).toContain("contactado");
  });

  it("lets a message go back to new, and be discarded", async () => {
    await setInboxStatus(db, id, "discarded", "admin-1");
    await setInboxStatus(db, id, "new", "admin-1");

    const [row] = await db.select().from(inboxMessages).where(eq(inboxMessages.id, id));
    expect(row?.status).toBe("new");
  });

  it("does not write an entry when nothing changes", async () => {
    await setInboxStatus(db, id, "new", "admin-1");

    expect(await db.select().from(auditLog)).toEqual([]);
  });

  it("rejects a message that does not exist", async () => {
    await expect(setInboxStatus(db, "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11", "contacted", "admin-1")).rejects.toBeInstanceOf(UserFacingError);
  });
});
