import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { fighters } from "@/db/schema/fighters";
import { postBodyMedia, postGallery, posts } from "@/db/schema/posts";
import { eq } from "drizzle-orm";
import { fighterIdBySlug, insertEvent } from "@/features/events/test-helpers";
import { seedFighters } from "@/features/fighters/seed";
import { insertMedia } from "@/features/fighters/test-helpers";
import { createTestDb } from "@/test/db";
import { getPostForEdit, getPostRelationIds, listAdminPosts, listCategories } from "./admin-queries";
import { categoryIdBySlug, daysAgo, insertPost } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedFighters(db);
});
afterAll(() => close());

describe("listAdminPosts", () => {
  it("shows drafts and scheduled posts but not the trash, by date (a scheduled post counts at its future date), 50 per page", async () => {
    await db.delete(posts);
    await insertPost(db, { title: "Borrador", status: "draft", createdAt: daysAgo(1) });
    await insertPost(db, { title: "Programada", status: "scheduled", publishAt: new Date(Date.now() + 86_400_000), createdAt: daysAgo(2) });
    await insertPost(db, { title: "Publicada", createdAt: daysAgo(3) });
    await insertPost(db, { title: "Borrada", deletedAt: new Date() });

    const { items, hasMore } = await listAdminPosts(db, {}, { page: 1 });
    expect(items.map((post) => post.title)).toEqual(["Programada", "Borrador", "Publicada"]);
    expect(hasMore).toBe(false);

    for (let index = 0; index < 52; index += 1) await insertPost(db, { title: `Relleno ${index}`, createdAt: daysAgo(10 + index) });
    const first = await listAdminPosts(db, {}, { page: 1 });
    expect(first.items).toHaveLength(50);
    expect(first.hasMore).toBe(true);
    expect((await listAdminPosts(db, {}, { page: 2 })).items).toHaveLength(5);
  });

  it("filters by publication, category and title text", async () => {
    await db.delete(posts);
    const entrevistas = await categoryIdBySlug(db, "entrevistas");
    await insertPost(db, { title: "Quiñónez habla del título", categoryId: entrevistas });
    await insertPost(db, { title: "Borrador de resultados", status: "draft" });

    const titles = async (filters: Parameters<typeof listAdminPosts>[1]) => (await listAdminPosts(db, filters, { page: 1 })).items.map((post) => post.title);
    expect(await titles({ publication: "draft" })).toEqual(["Borrador de resultados"]);
    expect(await titles({ category: "entrevistas" })).toEqual(["Quiñónez habla del título"]);
    expect(await titles({ q: "QUIÑÓNEZ" })).toEqual(["Quiñónez habla del título"]);
    expect(await titles({ q: "100%" })).toEqual([]);
  });
});

describe("getPostForEdit", () => {
  it("returns the post with cover, gallery in order and related items, flagging those that are not public", async () => {
    await db.delete(posts);
    const cover = await insertMedia(db, "news_cover");
    const galleryA = await insertMedia(db, "gallery");
    const galleryB = await insertMedia(db, "gallery");
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
    const event = await insertEvent(db, { name: "Evento de edición", slug: "evento-de-edicion", status: "draft" });
    const { id } = await insertPost(db, { coverMediaId: cover, fighterIds: [cevallos, quinonez], eventIds: [event.id] });
    await db.insert(postGallery).values([
      { postId: id, mediaId: galleryB, sortOrder: 1 },
      { postId: id, mediaId: galleryA, sortOrder: 0 },
    ]);
    await db.update(fighters).set({ deletedAt: new Date() }).where(eq(fighters.id, quinonez));

    try {
      const edit = await getPostForEdit(db, id);
      expect(edit?.cover?.id).toBe(cover);
      expect(edit?.gallery.map((item) => item.id)).toEqual([galleryA, galleryB]);
      expect(edit?.fighters).toEqual([
        { id: cevallos, label: "Bryan Cevallos", isPublic: true },
        { id: quinonez, label: "Jordan Quiñónez", isPublic: false },
      ]);
      expect(edit?.events).toEqual([{ id: event.id, label: "Evento de edición", isPublic: false }]);
    } finally {
      await db.update(fighters).set({ deletedAt: null }).where(eq(fighters.id, quinonez));
    }
  });

  it("returns null for a post in the trash", async () => {
    const { id } = await insertPost(db, { deletedAt: new Date() });
    expect(await getPostForEdit(db, id)).toBeNull();
  });

  it("is not affected by body media rows (they only mark images as in use)", async () => {
    const inBody = await insertMedia(db, "gallery");
    const { id } = await insertPost(db);
    await db.insert(postBodyMedia).values({ postId: id, mediaId: inBody });
    expect((await getPostForEdit(db, id))?.post.id).toBe(id);
  });
});

describe("listCategories", () => {
  it("lists the categories in order with how many posts use each one, trash included", async () => {
    await db.delete(posts);
    const resultados = await categoryIdBySlug(db, "resultados");
    await insertPost(db, { categoryId: resultados });
    await insertPost(db, { categoryId: resultados, deletedAt: new Date() });

    const rows = await listCategories(db);
    expect(rows.map((row) => row.name)).toEqual(["Anuncios", "Resultados", "Entrevistas", "Detrás de cámaras"]);
    expect(rows.find((row) => row.slug === "resultados")?.postCount).toBe(2);
    expect(rows.find((row) => row.slug === "anuncios")?.postCount).toBe(0);
  });
});

describe("getPostRelationIds", () => {
  it("lists every related fighter and event, public or not (their pages must refresh when the post changes)", async () => {
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const draftEvent = await insertEvent(db, { status: "draft" });
    const { id } = await insertPost(db, { fighterIds: [cevallos], eventIds: [draftEvent.id] });
    expect(await getPostRelationIds(db, id)).toEqual({ fighterIds: [cevallos], eventIds: [draftEvent.id] });
    expect(await getPostRelationIds(db, "00000000-0000-4000-8000-000000000000")).toEqual({ fighterIds: [], eventIds: [] });
  });
});
