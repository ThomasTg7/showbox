import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { fighters } from "@/db/schema/fighters";
import { events } from "@/db/schema/events";
import { postBodyMedia, postGallery, posts } from "@/db/schema/posts";
import { fighterIdBySlug, insertEvent } from "@/features/events/test-helpers";
import { insertMedia } from "@/features/fighters/test-helpers";
import { seedFighters } from "@/features/fighters/seed";
import { createTestDb } from "@/test/db";
import {
  getHomeNews,
  getPublicPostBySlug,
  getPublicPostRef,
  listPostsForEvent,
  listDontMissPosts,
  listPostsForFighter,
  listPublicPostCategories,
  listPublicPosts,
} from "./queries";
import { categoryIdBySlug, daysAgo, insertPost } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedFighters(db);
});
afterAll(() => close());

const titles = (items: { title: string }[]) => items.map((post) => post.title);

/** Cada describe parte de una tabla vacía: las noticias de un test no cuentan en el siguiente. */
async function clearPosts() {
  await db.delete(posts);
}

describe("getHomeNews", () => {
  it("takes the most recent featured post as main and the 5 latest of the others as top, without repeating it", async () => {
    await clearPosts();
    await insertPost(db, { title: "Destacada vieja", featured: true, createdAt: daysAgo(10) });
    await insertPost(db, { title: "Destacada nueva", featured: true, createdAt: daysAgo(2) });
    for (let day = 3; day <= 9; day += 1) await insertPost(db, { title: `Normal ${day}`, createdAt: daysAgo(day) });

    const { main, top } = await getHomeNews(db);

    expect(main?.title).toBe("Destacada nueva");
    expect(top).toHaveLength(5);
    expect(titles(top)).toEqual(["Normal 3", "Normal 4", "Normal 5", "Normal 6", "Normal 7"]);
    expect(titles(top)).not.toContain("Destacada nueva");
  });

  it("falls back to the most recent post as main when none is featured, and leaves it out of top", async () => {
    await clearPosts();
    for (let day = 1; day <= 7; day += 1) await insertPost(db, { title: `Normal ${day}`, createdAt: daysAgo(day) });
    const { main, top } = await getHomeNews(db);
    expect(main?.title).toBe("Normal 1");
    expect(titles(top)).toEqual(["Normal 2", "Normal 3", "Normal 4", "Normal 5", "Normal 6"]);
  });

  it("has no main and no top without public posts", async () => {
    await clearPosts();
    await insertPost(db, { title: "Borrador", status: "draft" });
    expect(await getHomeNews(db)).toEqual({ main: null, top: [] });
  });

  it("does not show a scheduled post before its date, a draft or one in the trash", async () => {
    await clearPosts();
    await insertPost(db, { title: "Programada futura", featured: true, status: "scheduled", publishAt: new Date(Date.now() + 3_600_000) });
    await insertPost(db, { title: "Borrador", status: "draft" });
    await insertPost(db, { title: "En la papelera", deletedAt: new Date() });
    await insertPost(db, { title: "Publicada" });

    const { main, top } = await getHomeNews(db);
    expect(main?.title).toBe("Publicada");
    expect(top).toEqual([]);
  });

  it("shows a scheduled post once its date has passed, dated by its publication time", async () => {
    await clearPosts();
    await insertPost(db, { title: "Vieja", createdAt: daysAgo(5) });
    await insertPost(db, { title: "Programada ya llegada", status: "scheduled", publishAt: daysAgo(0.01), createdAt: daysAgo(20) });

    const { main, top } = await getHomeNews(db);
    expect(main?.title).toBe("Programada ya llegada");
    expect(titles(top)).toEqual(["Vieja"]);
  });
});

describe("listPublicPosts", () => {
  it("paginates by 12 and reports whether there is a next page", async () => {
    await clearPosts();
    for (let index = 1; index <= 15; index += 1) await insertPost(db, { title: `Post ${index}`, createdAt: daysAgo(index) });

    const first = await listPublicPosts(db, {}, { page: 1 });
    expect(first.items).toHaveLength(12);
    expect(first.hasMore).toBe(true);

    const second = await listPublicPosts(db, {}, { page: 2 });
    expect(second.items).toHaveLength(3);
    expect(second.hasMore).toBe(false);
    expect(titles(second.items)).toEqual(["Post 13", "Post 14", "Post 15"]);
  });

  it("filters by category slug and returns nothing for an unknown category", async () => {
    await clearPosts();
    const entrevistas = await categoryIdBySlug(db, "entrevistas");
    await insertPost(db, { title: "Entrevista", categoryId: entrevistas });
    await insertPost(db, { title: "Anuncio" });

    expect(titles((await listPublicPosts(db, { category: "entrevistas" }, { page: 1 })).items)).toEqual(["Entrevista"]);
    expect((await listPublicPosts(db, { category: "no-existe" }, { page: 1 })).items).toEqual([]);
  });

  it("gives every card plain, JSON-safe values and the covers from a single media read", async () => {
    await clearPosts();
    const cover = await insertMedia(db, "news_cover");
    await insertPost(db, { title: "Con portada", coverMediaId: cover, excerpt: "Bajada" });
    await insertPost(db, { title: "Sin portada" });

    const { items } = await listPublicPosts(db, {}, { page: 1 });
    const withCover = items.find((post) => post.title === "Con portada")!;
    const withoutCover = items.find((post) => post.title === "Sin portada")!;
    expect(withCover.cover?.id).toBe(cover);
    expect(withoutCover.cover).toBeNull();
    expect(withCover.category).toEqual({ slug: "anuncios", name: "Anuncios" });
    expect(typeof withCover.date).toBe("string");
    expect(JSON.parse(JSON.stringify(withCover))).toEqual(withCover);
  });

  it("orders by publication time, falling back to creation time", async () => {
    await clearPosts();
    await insertPost(db, { title: "Creada hoy", createdAt: daysAgo(0.5) });
    await insertPost(db, { title: "Programada que ya salió", status: "scheduled", publishAt: daysAgo(0.1), createdAt: daysAgo(30) });
    await insertPost(db, { title: "De ayer", createdAt: daysAgo(1) });

    expect(titles((await listPublicPosts(db, {}, { page: 1 })).items)).toEqual(["Programada que ya salió", "Creada hoy", "De ayer"]);
  });
});

describe("getPublicPostBySlug", () => {
  it("returns the post with its gallery in order, the body images and the public relations", async () => {
    await clearPosts();
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
    const galleryA = await insertMedia(db, "gallery");
    const galleryB = await insertMedia(db, "gallery");
    const inBody = await insertMedia(db, "gallery");
    const event = await insertEvent(db, { name: "Evento de la noticia", slug: "evento-de-la-noticia" });
    const { id, slug } = await insertPost(db, {
      title: "Completa",
      fighterIds: [cevallos, quinonez],
      eventIds: [event.id],
      body: { type: "doc", content: [{ type: "paragraph" }, { type: "image", attrs: { mediaId: inBody } }] },
    });
    await db.insert(postGallery).values([
      { postId: id, mediaId: galleryB, sortOrder: 1 },
      { postId: id, mediaId: galleryA, sortOrder: 0 },
    ]);
    await db.insert(postBodyMedia).values({ postId: id, mediaId: inBody });

    const post = await getPublicPostBySlug(db, slug);

    expect(post?.gallery.map((item) => item.id)).toEqual([galleryA, galleryB]);
    expect(Object.keys(post!.bodyMedia)).toEqual([inBody]);
    expect(post!.fighters.map((fighter) => fighter.slug).sort()).toEqual(["bryan-cevallos", "jordan-quinonez"]);
    expect(post!.events).toEqual([{ id: event.id, slug: "evento-de-la-noticia", name: "Evento de la noticia", startsAt: expect.any(String) }]);
    expect(JSON.parse(JSON.stringify(post))).toEqual(post);
  });

  it("brings both photos of each related fighter, so one without a headshot shows the body photo", async () => {
    await clearPosts();
    const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
    const bodyId = await insertMedia(db, "fighter_body");
    const [before] = await db.select({ headshotMediaId: fighters.headshotMediaId, bodyMediaId: fighters.bodyMediaId }).from(fighters).where(eq(fighters.id, quinonez));
    await db.update(fighters).set({ headshotMediaId: null, bodyMediaId: bodyId }).where(eq(fighters.id, quinonez));
    try {
      const { slug } = await insertPost(db, { title: "Con Quiñónez", fighterIds: [quinonez] });
      const [fighter] = (await getPublicPostBySlug(db, slug))!.fighters;
      expect(fighter?.headshotMedia).toBeNull();
      expect(fighter?.bodyMedia?.id).toBe(bodyId);
    } finally {
      await db.update(fighters).set(before!).where(eq(fighters.id, quinonez));
    }
  });

  it("gives the last change of the post as an ISO date (dateModified of the news)", async () => {
    await clearPosts();
    const { id, slug } = await insertPost(db, { title: "Con cambio" });
    const [row] = await db.select({ updatedAt: posts.updatedAt }).from(posts).where(eq(posts.id, id));

    const post = await getPublicPostBySlug(db, slug);

    expect(post?.updatedAt).toBe(row!.updatedAt.toISOString());
  });

  it("hides a related fighter that is in the trash or a draft, and a related event in the trash", async () => {
    await clearPosts();
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
    const andrango = await fighterIdBySlug(db, "kevin-andrango");
    const trashedEvent = await insertEvent(db, { name: "Evento borrado", slug: "evento-borrado", deletedAt: new Date() });
    const { slug } = await insertPost(db, { fighterIds: [cevallos, quinonez, andrango], eventIds: [trashedEvent.id] });
    await db.update(fighters).set({ deletedAt: new Date() }).where(eq(fighters.id, quinonez));
    await db.update(fighters).set({ status: "draft" }).where(eq(fighters.id, andrango));

    try {
      const post = await getPublicPostBySlug(db, slug);
      expect(post!.fighters.map((fighter) => fighter.slug)).toEqual(["bryan-cevallos"]);
      expect(post!.events).toEqual([]);
    } finally {
      await db.update(fighters).set({ deletedAt: null }).where(eq(fighters.id, quinonez));
      await db.update(fighters).set({ status: "published" }).where(eq(fighters.id, andrango));
      await db.update(events).set({ deletedAt: null }).where(eq(events.id, trashedEvent.id));
    }
  });

  it("does not return a draft, a future scheduled post or one in the trash, unless it is a preview", async () => {
    await clearPosts();
    const draft = await insertPost(db, { status: "draft" });
    const future = await insertPost(db, { status: "scheduled", publishAt: new Date(Date.now() + 3_600_000) });
    const trashed = await insertPost(db, { deletedAt: new Date() });

    for (const { slug } of [draft, future, trashed]) expect(await getPublicPostBySlug(db, slug)).toBeNull();
    expect((await getPublicPostBySlug(db, draft.slug, { preview: true }))?.id).toBe(draft.id);
    expect((await getPublicPostBySlug(db, future.slug, { preview: true }))?.id).toBe(future.id);
    expect(await getPublicPostBySlug(db, trashed.slug, { preview: true })).toBeNull();
  });
});

describe("getPublicPostRef", () => {
  it("returns the id and cover of a public post and nothing for a hidden one", async () => {
    await clearPosts();
    const cover = await insertMedia(db, "news_cover");
    const visible = await insertPost(db, { coverMediaId: cover });
    const hidden = await insertPost(db, { status: "draft" });

    expect(await getPublicPostRef(db, visible.slug)).toEqual({ id: visible.id, coverMediaId: cover });
    expect(await getPublicPostRef(db, hidden.slug)).toBeNull();
  });
});

describe("related posts", () => {
  it("lists the public posts of a fighter or an event, newest first, up to the limit", async () => {
    await clearPosts();
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
    const event = await insertEvent(db, { name: "Evento relacionado", slug: "evento-relacionado" });
    await insertPost(db, { title: "Vieja de Cevallos", fighterIds: [cevallos], createdAt: daysAgo(9) });
    await insertPost(db, { title: "Nueva de Cevallos", fighterIds: [cevallos], eventIds: [event.id], createdAt: daysAgo(2) });
    await insertPost(db, { title: "De Quiñónez", fighterIds: [quinonez] });
    await insertPost(db, { title: "Borrador de Cevallos", fighterIds: [cevallos], status: "draft" });
    await insertPost(db, { title: "Papelera de Cevallos", fighterIds: [cevallos], deletedAt: new Date() });

    expect(titles(await listPostsForFighter(db, cevallos))).toEqual(["Nueva de Cevallos", "Vieja de Cevallos"]);
    expect(titles(await listPostsForFighter(db, cevallos, 1))).toEqual(["Nueva de Cevallos"]);
    expect(titles(await listPostsForEvent(db, event.id))).toEqual(["Nueva de Cevallos"]);
    expect(await listPostsForEvent(db, "00000000-0000-4000-8000-000000000000")).toEqual([]);
  });
});

describe("listPublicPostCategories", () => {
  it("lists, in catalog order, only the categories that have a post visible now", async () => {
    await clearPosts();
    await insertPost(db, { categoryId: await categoryIdBySlug(db, "entrevistas") });
    await insertPost(db, { categoryId: await categoryIdBySlug(db, "resultados"), status: "draft" });
    await insertPost(db, { categoryId: await categoryIdBySlug(db, "anuncios"), deletedAt: new Date() });
    await insertPost(db, { categoryId: await categoryIdBySlug(db, "detras-de-camaras"), status: "scheduled", publishAt: new Date(Date.now() + 3_600_000) });
    await insertPost(db, { categoryId: await categoryIdBySlug(db, "anuncios") });

    expect(await listPublicPostCategories(db)).toEqual([
      { id: expect.any(String), slug: "anuncios", name: "Anuncios" },
      { id: expect.any(String), slug: "entrevistas", name: "Entrevistas" },
    ]);
  });
});

describe("listDontMissPosts", () => {
  it("lists the latest public posts that have a video, a social post or a gallery, newest first, up to the limit", async () => {
    await clearPosts();
    await insertPost(db, { title: "Solo texto", createdAt: daysAgo(1) });
    await insertPost(db, { title: "Video viejo", hasMedia: true, createdAt: daysAgo(30) });
    await insertPost(db, { title: "Galería reciente", hasMedia: true, createdAt: daysAgo(2) });
    await insertPost(db, { title: "Video medio", hasMedia: true, createdAt: daysAgo(10) });

    expect(titles(await listDontMissPosts(db, 8))).toEqual(["Galería reciente", "Video medio", "Video viejo"]);
    expect(titles(await listDontMissPosts(db, 2))).toEqual(["Galería reciente", "Video medio"]);
  });

  it("leaves out what is not public: drafts, scheduled in the future and the trash", async () => {
    await clearPosts();
    await insertPost(db, { title: "Pública", hasMedia: true });
    await insertPost(db, { title: "Borrador", hasMedia: true, status: "draft" });
    await insertPost(db, { title: "Programada", hasMedia: true, status: "scheduled", publishAt: new Date(Date.now() + 86_400_000) });
    await insertPost(db, { title: "En la papelera", hasMedia: true, deletedAt: new Date() });

    expect(titles(await listDontMissPosts(db, 8))).toEqual(["Pública"]);
  });

  it("returns cards with their category and cover, reading the covers in one go", async () => {
    await clearPosts();
    const cover = await insertMedia(db, "news_cover");
    await insertPost(db, { title: "Con portada", hasMedia: true, coverMediaId: cover, categoryId: await categoryIdBySlug(db, "resultados") });

    const [card] = await listDontMissPosts(db, 8);

    expect(card?.category).toEqual({ slug: "resultados", name: "Resultados" });
    expect(card?.cover?.id).toBe(cover);
  });

  it("is empty when no post has a video or a gallery", async () => {
    await clearPosts();
    await insertPost(db, { title: "Solo texto" });

    expect(await listDontMissPosts(db, 8)).toEqual([]);
  });
});
