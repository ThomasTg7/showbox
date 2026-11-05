import { eq, max } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { posts } from "@/db/schema/posts";
import { rankingVersions } from "@/db/schema/rankings";
import type { PostBody } from "@/domain/post-body";
import { seedDivisions } from "@/features/divisions/seed";
import { daysFromNow, insertEvent } from "@/features/events/test-helpers";
import { seedEvents } from "@/features/events/seed";
import { createFighter } from "@/features/fighters/service";
import { divisionIdBySlug, validFighterInput } from "@/features/fighters/test-helpers";
import { seedPosts } from "@/features/posts/seed";
import { daysAgo, insertPost } from "@/features/posts/test-helpers";
import { seedRankings } from "@/features/rankings/seed";
import { setRankingVisibility } from "@/features/rankings/service";
import { saveSetting } from "@/features/settings/service";
import { createTestDb } from "@/test/db";
import { getSitemapEntries } from "./sitemap-entries";

const SITE = "https://showbox.test";
const text = (value: string): PostBody => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: value }] }] });

describe("getSitemapEntries", () => {
  let db: Db;
  let close: () => Promise<void>;

  const entries = async () => new Map((await getSitemapEntries(db, SITE)).map((entry) => [entry.url, entry]));
  const urls = async () => [...(await entries()).keys()];

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    await seedDivisions(db);
    await seedRankings(db);
    await seedEvents(db);
    await seedPosts(db);
  });
  afterAll(() => close());

  it("always lists the home, the listings and the forms", async () => {
    expect(await urls()).toEqual(
      expect.arrayContaining([SITE, `${SITE}/eventos`, `${SITE}/boxeadores`, `${SITE}/noticias`, `${SITE}/entradas`, `${SITE}/quiero-pelear`, `${SITE}/patrocinar`]),
    );
  });

  it("lists the fixed pages only once they have something to show", async () => {
    const empty = await urls();
    for (const path of ["/nosotros", "/privacidad", "/contacto"]) expect(empty).not.toContain(`${SITE}${path}`);

    await saveSetting(db, "about", { body: text("Somos ShowBox") }, "admin-1");
    await saveSetting(db, "contact", { email: "hola@showbox.test" }, "admin-1");
    const privacyAt = new Date("2026-10-04T15:00:00.000Z");
    await saveSetting(db, "privacy", { body: text("Cuidamos tus datos") }, "admin-1", privacyAt);

    const filled = await entries();
    expect([...filled.keys()]).toEqual(expect.arrayContaining([`${SITE}/nosotros`, `${SITE}/privacidad`, `${SITE}/contacto`]));
    // La política lleva la fecha de su último cambio.
    expect(filled.get(`${SITE}/privacidad`)?.lastModified).toEqual(privacyAt);
  });

  it("lists the public fighters, events and news by slug with their last change", async () => {
    const all = await entries();
    const [cevallos] = await db.select({ updatedAt: fighters.updatedAt }).from(fighters).where(eq(fighters.slug, "bryan-cevallos"));
    expect(all.get(`${SITE}/boxeadores/bryan-cevallos`)?.lastModified).toEqual(cevallos!.updatedAt);
    expect(all.has(`${SITE}/eventos/showbox-fight-night-5`)).toBe(true);
    expect(all.has(`${SITE}/noticias/cevallos-defiende-el-cinturon-ante-quinonez`)).toBe(true);
  });

  it("lists /rankings with the date of the newest pro ranking version, and the amateur one apart", async () => {
    const all = await entries();
    const [row] = await db.select({ newest: max(rankingVersions.createdAt) }).from(rankingVersions).where(eq(rankingVersions.level, "pro"));
    expect(row?.newest).toBeInstanceOf(Date);
    expect(all.get(`${SITE}/rankings`)?.lastModified).toEqual(row!.newest);
    expect(all.has(`${SITE}/rankings?nivel=amateur`)).toBe(true);
  });

  it("keeps a ranking level with hidden positions while it still shows its champions", async () => {
    await setRankingVisibility(db, "amateur", false, "admin-1");
    await setRankingVisibility(db, "pro", false, "admin-1");
    const hidden = await urls();
    expect(hidden).toContain(`${SITE}/rankings?nivel=amateur`);
    expect(hidden).toContain(`${SITE}/rankings`);
    await setRankingVisibility(db, "amateur", true, "admin-1");
    await setRankingVisibility(db, "pro", true, "admin-1");
  });

  it("lists the news categories that have a visible post", async () => {
    const all = await urls();
    expect(all).toContain(`${SITE}/noticias?categoria=anuncios`);
    expect(all.filter((url) => url.startsWith(`${SITE}/noticias?categoria=`)).length).toBeGreaterThan(0);
  });

  it("never lists a draft, a scheduled-in-the-future or a trashed fighter, event or post", async () => {
    const ligero = await divisionIdBySlug(db, "peso-superligero");
    const fighterBase = { divisionId: ligero } as const;
    const draft = await createFighter(db, validFighterInput(ligero, { firstName: "Sitemap", lastName: "Borrador" }), "admin-1");
    const future = await createFighter(db, validFighterInput(ligero, { firstName: "Sitemap", lastName: "Futuro", status: "scheduled", publishAt: daysFromNow(5).toISOString() } as never), "admin-1");
    const trashed = await createFighter(db, validFighterInput(fighterBase.divisionId, { firstName: "Sitemap", lastName: "Papelera", status: "published" }), "admin-1");
    await db.update(fighters).set({ deletedAt: new Date() }).where(eq(fighters.id, trashed.id));

    const eventDraft = await insertEvent(db, { status: "draft" });
    const eventFuture = await insertEvent(db, { status: "scheduled", publishAt: daysFromNow(5) });
    const eventTrashed = await insertEvent(db, {});
    await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, eventTrashed.id));

    const postDraft = await insertPost(db, { status: "draft" });
    const postFuture = await insertPost(db, { status: "scheduled", publishAt: daysFromNow(5) });
    const postTrashed = await insertPost(db, {});
    await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, postTrashed.id));

    const all = await urls();
    for (const url of [
      `/boxeadores/${draft.slug}`,
      `/boxeadores/${future.slug}`,
      `/boxeadores/${trashed.slug}`,
      `/eventos/${eventDraft.slug}`,
      `/eventos/${eventFuture.slug}`,
      `/eventos/${eventTrashed.slug}`,
      `/noticias/${postDraft.slug}`,
      `/noticias/${postFuture.slug}`,
      `/noticias/${postTrashed.slug}`,
    ]) {
      expect(all).not.toContain(`${SITE}${url}`);
    }
  });

  it("lists a scheduled post once its publication time has passed", async () => {
    const due = await insertPost(db, { status: "scheduled", publishAt: daysAgo(1) });
    expect(await urls()).toContain(`${SITE}/noticias/${due.slug}`);
  });

  it("lists every page URL once", async () => {
    const all = await urls();
    expect(new Set(all).size).toBe(all.length);
  });
});
