import { eq, ne } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { rankingLevels } from "@/db/schema/rankings";
import { getNextEvent, getPublicEventBySlug, listPublicEvents } from "@/features/events/queries";
import { listPublicFighterCardsByIds, listPublicFighters } from "@/features/fighters/queries";
import { seedPosts } from "@/features/posts/seed";
import { getHomeNews, listDontMissPosts } from "@/features/posts/queries";
import { getBoutRankLabels, getPublicRankings } from "@/features/rankings/queries";
import { seedRankings } from "@/features/rankings/seed";
import { listSponsorsFor } from "@/features/sponsors/queries";
import { createTestDb } from "@/test/db";
import { buildHomeData, getHomeStats, type HomeSources } from "./queries";

/** Las mismas lecturas de producción, pero directo sobre la base de prueba (la caché de Next no existe fuera del servidor). */
function sourcesFor(db: Db): HomeSources {
  return {
    nextEvent: () => getNextEvent(db),
    pastEvents: async () => (await listPublicEvents(db, { when: "past" }, { page: 1 })).items,
    eventPage: (slug) => getPublicEventBySlug(db, slug),
    rankLabels: async (_eventId, boutIds) => Object.fromEntries(await getBoutRankLabels(db, boutIds)),
    news: () => getHomeNews(db),
    dontMiss: () => listDontMissPosts(db, 8),
    rankings: (level) => getPublicRankings(db, level),
    fighterCards: (ids) => listPublicFighterCardsByIds(db, ids),
    publicFighters: async () => (await listPublicFighters(db, {}, { page: 1 })).items,
    stats: () => getHomeStats(db),
    sponsors: () => listSponsorsFor(db, "home"),
  };
}

describe("buildHomeData", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("with an upcoming event, the cover is that event and the fighters are the champions and the top of each division", async () => {
    await seedRankings(db);
    await seedPosts(db);

    const home = await buildHomeData(sourcesFor(db));

    expect(home.hero.kind).toBe("next-event");
    if (home.hero.kind !== "brand") expect(home.hero.event.slug).toBe("showbox-fight-night-5");
    expect(home.news.main).not.toBeNull();
    expect(home.news.top.length).toBeGreaterThan(0);
    expect(home.stats.events).toBeGreaterThan(0);
    expect(home.rankings.pro.length).toBeLessThanOrEqual(3);
    expect(home.rankings.pro[0]?.division).toBeNull();
    const cevallos = home.fighters.find((item) => item.fighter.slug === "bryan-cevallos");
    expect(cevallos).toMatchObject({ badge: "Campeón", backdrop: "C" });
    expect(home.fighters.length).toBeLessThanOrEqual(8);
    // Cada división aporta a su campeón y, detrás, a los primeros del ranking con el puesto que muestra /rankings.
    expect(home.fighters.filter((item) => item.badge === "Campeón").length).toBeGreaterThan(1);
    expect(home.fighters.filter((item) => item.badge?.startsWith("#")).every((item) => item.backdrop === item.badge?.slice(1))).toBe(true);
  });

  it("is JSON-safe: the home is made of cached reads", async () => {
    await seedRankings(db);
    const home = await buildHomeData(sourcesFor(db));

    expect(JSON.parse(JSON.stringify(home))).toEqual(home);
  });

  it("without an upcoming event the cover is the last finished event", async () => {
    await seedRankings(db);
    await db.update(events).set({ deletedAt: new Date() }).where(ne(events.eventStatus, "completed"));

    const home = await buildHomeData(sourcesFor(db));

    expect(home.hero.kind).toBe("last-event");
    if (home.hero.kind === "last-event") expect(home.hero.event.eventStatus).toBe("completed");
  });

  it("without any event the cover is the brand block and nothing else breaks", async () => {
    const home = await buildHomeData(sourcesFor(db));

    expect(home.hero).toEqual({ kind: "brand" });
    expect(home.fighters).toEqual([]);
    expect(home.dontMiss).toEqual([]);
    expect(home.news).toEqual({ main: null, top: [] });
    expect(home.stats).toEqual({ events: 0, bouts: 0, finishes: 0, koTko: 0 });
    expect(home.rankings).toEqual({ pro: [], amateur: [] });
    expect(home.sponsors).toEqual([]);
  });

  it("with the pro positions hidden the home keeps showing the champions, without numbers", async () => {
    await seedRankings(db);
    await db.update(rankingLevels).set({ isPublic: false }).where(eq(rankingLevels.level, "pro"));

    const home = await buildHomeData(sourcesFor(db));

    expect(home.rankings.pro.length).toBeGreaterThan(0);
    expect(home.rankings.pro.every((card) => card.champion !== null && card.entries.length === 0 && card.division !== null)).toBe(true);
    expect(home.fighters.length).toBeGreaterThan(0);
    await db.update(rankingLevels).set({ isPublic: true }).where(eq(rankingLevels.level, "pro"));
  });

  it("with a fighter that is no longer public, the highlights skip it without leaving a gap", async () => {
    await seedRankings(db);
    const sources = sourcesFor(db);
    const withoutPerez: HomeSources = { ...sources, fighterCards: async (ids) => (await sources.fighterCards(ids)).filter((card) => card.slug !== "bryan-cevallos") };

    const home = await buildHomeData(withoutPerez);

    expect(home.fighters.some((item) => item.fighter.slug === "bryan-cevallos")).toBe(false);
    expect(home.fighters.length).toBeGreaterThan(0);
  });
});
