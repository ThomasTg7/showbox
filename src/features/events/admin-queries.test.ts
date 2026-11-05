import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { createTestDb } from "@/test/db";
import { listAdminEvents } from "./admin-queries";
import { seedEvents } from "./seed";
import { daysFromNow, insertEvent } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedEvents(db);
  await insertEvent(db, { name: "Evento borrador", slug: "evento-borrador", status: "draft", startsAt: daysFromNow(60) });
  await insertEvent(db, { name: "Evento en la papelera", slug: "evento-papelera", deletedAt: new Date(), startsAt: daysFromNow(61) });
});
afterAll(() => close());

describe("listAdminEvents", () => {
  it("lists drafts and published events, newest date first, but not the trash", async () => {
    const { items } = await listAdminEvents(db, {});
    expect(items.map((event) => event.name)).toEqual([
      "Evento borrador",
      "ShowBox Fight Night 5",
      "ShowBox Fight Night 4",
      "ShowBox Fight Night 3",
      "ShowBox Fight Night 2",
      "ShowBox Fight Night 1",
    ]);
  });

  it("counts the fights of each event without one query per event", async () => {
    const { items } = await listAdminEvents(db, {});
    const counts = Object.fromEntries(items.map((event) => [event.name, event.boutCount]));
    expect(counts).toMatchObject({ "ShowBox Fight Night 5": 5, "ShowBox Fight Night 1": 4, "Evento borrador": 0 });
  });

  it("filters by name text without regard to case, and treats wildcards as plain text", async () => {
    expect((await listAdminEvents(db, { q: "fight night 4" })).items.map((event) => event.name)).toEqual(["ShowBox Fight Night 4"]);
    expect((await listAdminEvents(db, { q: "BORRADOR" })).items.map((event) => event.name)).toEqual(["Evento borrador"]);
    expect((await listAdminEvents(db, { q: "%" })).items).toEqual([]);
  });

  it("filters by publication state", async () => {
    const { items } = await listAdminEvents(db, { publication: "draft" });
    expect(items.map((event) => event.name)).toEqual(["Evento borrador"]);
  });

  it("paginates with a lookahead row", async () => {
    const first = await listAdminEvents(db, {}, { page: 1, pageSize: 4 });
    const second = await listAdminEvents(db, {}, { page: 2, pageSize: 4 });
    expect(first.items).toHaveLength(4);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(2);
    expect(second.hasMore).toBe(false);
  });
});
