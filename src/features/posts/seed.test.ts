import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { postCategories, postEvents, postFighters, posts } from "@/db/schema/posts";
import { validatePostBody } from "@/domain/post-body";
import { seedEvents } from "@/features/events/seed";
import { createTestDb } from "@/test/db";
import { getHomeNews, listPublicPosts } from "./queries";
import { seedPosts } from "./seed";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedEvents(db);
  await seedPosts(db);
});
afterAll(() => close());

describe("seedPosts", () => {
  it("creates the four categories and ten public posts with valid bodies", async () => {
    expect(await db.select().from(postCategories)).toHaveLength(4);
    const rows = await db.select().from(posts);
    expect(rows).toHaveLength(10);
    for (const row of rows) expect(validatePostBody(row.body), row.title).toBe(true);
    expect((await listPublicPosts(db, {}, { page: 1 })).items).toHaveLength(10);
  });

  it("relates posts to the seeded fighters and events and gives the home a main story", async () => {
    expect((await db.select().from(postFighters)).length).toBeGreaterThan(0);
    expect((await db.select().from(postEvents)).length).toBeGreaterThan(0);
    const { main, top } = await getHomeNews(db);
    expect(main?.title).toBe("Cevallos defiende el cinturón ante Quiñónez");
    expect(top).toHaveLength(5);
  });

  it("is idempotent", async () => {
    await seedPosts(db);
    expect(await db.select().from(posts)).toHaveLength(10);
    expect(await db.select().from(postCategories)).toHaveLength(4);
  });
});
