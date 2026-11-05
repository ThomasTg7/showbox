import { eq, sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { createTrash } from "./trash";

const notes = pgTable("trash_test_notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

const tags = pgTable("trash_test_tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

const trash = createTrash([
  { type: "note", label: "Nota", table: notes, title: notes.title },
  { type: "tag", label: "Etiqueta", table: tags, title: tags.name },
]);

const day = 24 * 60 * 60 * 1000;

describe("trash", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await db.execute(sql`create temporary table trash_test_notes (id text primary key, title text not null, deleted_at timestamptz)`);
    await db.execute(sql`create temporary table trash_test_tags (id text primary key, name text not null, deleted_at timestamptz)`);
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await db.execute(sql`delete from trash_test_notes`);
    await db.execute(sql`delete from trash_test_tags`);
    await db.execute(sql`delete from audit_log`);
    await db.insert(notes).values([
      { id: "a", title: "Nota A" },
      { id: "b", title: "Nota B" },
    ]);
  });

  it("softDelete sets deletedAt and logs a delete entry naming the item", async () => {
    await trash.softDelete(db, "note", "a", "actor-1");

    const [row] = await db.select().from(notes).where(eq(notes.id, "a"));
    expect(row.deletedAt).not.toBeNull();
    const [logRow] = await db.select().from(auditLog).where(eq(auditLog.entityId, "a"));
    expect(logRow).toMatchObject({ action: "delete", entityType: "note", actorId: "actor-1" });
    expect(logRow.summary).toContain("Nota A");
  });

  it("softDelete of a missing item throws and logs nothing", async () => {
    await expect(trash.softDelete(db, "note", "no-existe", "actor-1")).rejects.toThrow("No se encontró");
    expect(await db.select().from(auditLog)).toEqual([]);
  });

  it("restore clears deletedAt and logs a restore entry", async () => {
    await trash.softDelete(db, "note", "a", "actor-1");
    await trash.restore(db, "note", "a", "actor-1");

    const [row] = await db.select().from(notes).where(eq(notes.id, "a"));
    expect(row.deletedAt).toBeNull();
    const restoreLogs = await db.select().from(auditLog).where(eq(auditLog.action, "restore"));
    expect(restoreLogs).toEqual([expect.objectContaining({ entityId: "a", entityType: "note", actorId: "actor-1" })]);
  });

  it("restore of an item that is not in the trash throws", async () => {
    await expect(trash.restore(db, "note", "a", "actor-1")).rejects.toThrow("No se encontró");
  });

  it("rejects an unknown entity type", async () => {
    await expect(trash.softDelete(db, "fantasma", "a", "actor-1")).rejects.toThrow("fantasma");
  });

  it("lists trashed items of every entity, newest first, with a readable title", async () => {
    await db.insert(tags).values({ id: "t", name: "Etiqueta T", deletedAt: new Date(Date.now() - 60_000) });
    await db.update(notes).set({ deletedAt: new Date(Date.now() - 120_000) }).where(eq(notes.id, "a"));

    const { items, hasMore } = await trash.listTrash(db);

    expect(hasMore).toBe(false);
    expect(items.map((item) => [item.entityType, item.entityLabel, item.id, item.title])).toEqual([
      ["tag", "Etiqueta", "t", "Etiqueta T"],
      ["note", "Nota", "a", "Nota A"],
    ]);
  });

  it("paginates the trash", async () => {
    const now = Date.now();
    await db.update(notes).set({ deletedAt: new Date(now - 1000) }).where(eq(notes.id, "a"));
    await db.update(notes).set({ deletedAt: new Date(now - 2000) }).where(eq(notes.id, "b"));
    await db.insert(tags).values({ id: "t", name: "Etiqueta T", deletedAt: new Date(now - 3000) });

    const first = await trash.listTrash(db, { page: 1, pageSize: 2 });
    const second = await trash.listTrash(db, { page: 2, pageSize: 2 });

    expect(first.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(first.hasMore).toBe(true);
    expect(second.items.map((item) => item.id)).toEqual(["t"]);
    expect(second.hasMore).toBe(false);
  });

  it("purgeExpired deletes only items trashed 30 days ago or more, and returns the count", async () => {
    const now = new Date();
    await db
      .update(notes)
      .set({ deletedAt: new Date(now.getTime() - 30 * day - 60_000) })
      .where(eq(notes.id, "a"));
    await db
      .update(notes)
      .set({ deletedAt: new Date(now.getTime() - 30 * day + 60_000) })
      .where(eq(notes.id, "b"));

    const purged = await trash.purgeExpired(db, now);

    expect(purged).toBe(1);
    expect(await db.select({ id: notes.id }).from(notes)).toEqual([{ id: "b" }]);
  });
});
