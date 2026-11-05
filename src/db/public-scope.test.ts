import { sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db";
import { publicationStatus } from "@/db/schema/_columns";
import { isPublic, type PublicationState } from "@/domain/publication";
import { publicScope } from "./public-scope";

const scopeTestTable = pgTable("public_scope_test", {
  label: text("label").primaryKey(),
  status: publicationStatus("status").notNull(),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

const now = new Date();
const oneDay = 24 * 60 * 60 * 1000;

const rows: Array<{ label: string } & PublicationState> = [
  { label: "published", status: "published", publishAt: null, deletedAt: null },
  { label: "draft", status: "draft", publishAt: null, deletedAt: null },
  { label: "published_deleted", status: "published", publishAt: null, deletedAt: now },
  {
    label: "scheduled_past",
    status: "scheduled",
    publishAt: new Date(now.getTime() - oneDay),
    deletedAt: null,
  },
  {
    label: "scheduled_future",
    status: "scheduled",
    publishAt: new Date(now.getTime() + oneDay),
    deletedAt: null,
  },
  { label: "scheduled_null", status: "scheduled", publishAt: null, deletedAt: null },
];

describe("publicScope", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(async () => {
    testDb = await createTestDb();
    await testDb.db.execute(sql`
      create temporary table public_scope_test (
        label text primary key,
        status publication_status not null,
        publish_at timestamptz,
        deleted_at timestamptz
      )
    `);
    await testDb.db.insert(scopeTestTable).values(rows);
  });

  afterAll(async () => {
    await testDb.close();
  });

  it("matches isPublic for every combination of status, publishAt and deletedAt", async () => {
    const visible = await testDb.db
      .select({ label: scopeTestTable.label })
      .from(scopeTestTable)
      .where(publicScope(scopeTestTable));

    const expectedLabels = rows
      .filter((row) => isPublic(row, now))
      .map((row) => row.label)
      .sort();

    expect(visible.map((row) => row.label).sort()).toEqual(expectedLabels);
  });
});
