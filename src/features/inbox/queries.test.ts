import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { inboxMessages } from "@/db/schema/inbox";
import { createTestDb } from "@/test/db";
import { countNewInbox, getInboxMessage, listInbox, type InboxFilters } from "./queries";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

async function insertMessage(db: Db, overrides: Partial<typeof inboxMessages.$inferInsert> = {}): Promise<string> {
  const [row] = await db
    .insert(inboxMessages)
    .values({
      kind: "fighter_application",
      name: "Tomás Vera",
      email: "tomas@example.cl",
      payload: { birthDate: "1998-04-12", weightKg: 70, record: null, gym: null, videoLinks: [], message: null },
      consentAt: new Date(),
      ...overrides,
    })
    .returning({ id: inboxMessages.id });
  return row!.id;
}

describe("inbox queries", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  const names = async (filters: InboxFilters) => (await listInbox(db, filters)).items.map((item) => item.name);

  describe("listInbox", () => {
    it("lists the newest first", async () => {
      await insertMessage(db, { name: "Vieja", createdAt: minutesAgo(30) });
      await insertMessage(db, { name: "Reciente", createdAt: minutesAgo(1) });
      await insertMessage(db, { name: "Media", createdAt: minutesAgo(10) });

      expect(await names({})).toEqual(["Reciente", "Media", "Vieja"]);
    });

    it("filters by kind and by status, together or apart", async () => {
      await insertMessage(db, { name: "Postulación nueva", createdAt: minutesAgo(4) });
      await insertMessage(db, { name: "Postulación contactada", status: "contacted", createdAt: minutesAgo(3) });
      await insertMessage(db, { name: "Marca nueva", kind: "sponsorship", payload: { contactName: "Ana", message: null }, createdAt: minutesAgo(2) });
      await insertMessage(db, { name: "Marca descartada", kind: "sponsorship", status: "discarded", payload: { contactName: "Luis", message: null }, createdAt: minutesAgo(1) });

      expect(await names({ kind: "sponsorship" })).toEqual(["Marca descartada", "Marca nueva"]);
      expect(await names({ status: "new" })).toEqual(["Marca nueva", "Postulación nueva"]);
      expect(await names({ kind: "fighter_application", status: "contacted" })).toEqual(["Postulación contactada"]);
    });

    it("paginates at most 50 per page and tells when there are more", async () => {
      for (let index = 0; index < 3; index += 1) await insertMessage(db, { name: `Mensaje ${index}`, createdAt: minutesAgo(index) });

      const first = await listInbox(db, {}, { pageSize: 2 });
      const second = await listInbox(db, {}, { page: 2, pageSize: 2 });

      expect(first.items.map((item) => item.name)).toEqual(["Mensaje 0", "Mensaje 1"]);
      expect(first.hasMore).toBe(true);
      expect(second.items.map((item) => item.name)).toEqual(["Mensaje 2"]);
      expect(second.hasMore).toBe(false);
    });
  });

  describe("countNewInbox", () => {
    it("counts only the messages nobody has answered yet", async () => {
      await insertMessage(db);
      await insertMessage(db, { kind: "sponsorship", payload: { contactName: "Ana", message: null } });
      await insertMessage(db, { status: "contacted" });
      await insertMessage(db, { status: "discarded" });

      expect(await countNewInbox(db)).toBe(2);
    });

    it("is zero for an empty inbox", async () => {
      expect(await countNewInbox(db)).toBe(0);
    });
  });

  describe("getInboxMessage", () => {
    it("returns the whole message, payload included", async () => {
      const id = await insertMessage(db, { phone: "+593 99 123 4567" });

      const message = await getInboxMessage(db, id);

      expect(message).toMatchObject({ id, kind: "fighter_application", name: "Tomás Vera", phone: "+593 99 123 4567", status: "new" });
      expect(message?.payload).toMatchObject({ weightKg: 70 });
    });

    it("is null for an id that does not exist", async () => {
      expect(await getInboxMessage(db, "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11")).toBeNull();
    });
  });
});
