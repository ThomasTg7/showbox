import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { fighters } from "@/db/schema/fighters";
import { inboxMessages } from "@/db/schema/inbox";
import { daysFromNow, fighterIdBySlug, insertBout, insertEvent, insertSegment } from "@/features/events/test-helpers";
import { createFighter, setFighterPublication } from "@/features/fighters/service";
import { divisionIdBySlug, validFighterInput } from "@/features/fighters/test-helpers";
import { createPost, setPostPublication } from "@/features/posts/service";
import { categoryIdBySlug, validPostInput } from "@/features/posts/test-helpers";
import { seedRankings } from "@/features/rankings/seed";
import { createTestDb } from "@/test/db";
import { getDashboard } from "./queries";

describe("getDashboard", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  async function draftFighter(firstName: string) {
    return createFighter(db, validFighterInput(await divisionIdBySlug(db, "peso-superligero"), { firstName, lastName: "Borrador" }), "admin-1");
  }

  it("lists a draft fighter and a draft post with their type, and not what is already published", async () => {
    const fighter = await draftFighter("Tomás");
    const post = await createPost(db, validPostInput(await categoryIdBySlug(db, "anuncios"), { title: "Noticia en borrador" }), "admin-1");
    const published = await draftFighter("Publicado");
    await setFighterPublication(db, published.id, { status: "published", publishAt: null }, "admin-1");

    const { drafts } = await getDashboard(db);

    expect(drafts.map((draft) => [draft.type, draft.id, draft.title]).sort()).toEqual(
      [
        ["fighter", fighter.id, "Tomás Borrador"],
        ["post", post.id, "Noticia en borrador"],
      ].sort(),
    );
  });

  it("lists what is scheduled with its type and date, soonest first", async () => {
    const later = await draftFighter("Después");
    await setFighterPublication(db, later.id, { status: "scheduled", publishAt: daysFromNow(9) }, "admin-1");
    const post = await createPost(db, validPostInput(await categoryIdBySlug(db, "anuncios"), { title: "Programada" }), "admin-1");
    const soon = daysFromNow(2);
    await setPostPublication(db, post.id, { status: "scheduled", publishAt: soon }, "admin-1");

    const { scheduled, drafts } = await getDashboard(db);

    expect(drafts).toEqual([]);
    expect(scheduled.map((item) => [item.type, item.title])).toEqual([
      ["post", "Programada"],
      ["fighter", "Después Borrador"],
    ]);
    expect(scheduled[0]?.publishAt.getTime()).toBe(soon.getTime());
  });

  it("does not list drafts that are in the trash", async () => {
    const fighter = await draftFighter("Papelera");
    await db.update(fighters).set({ deletedAt: new Date() }).where(eq(fighters.id, fighter.id));

    expect((await getDashboard(db)).drafts).toEqual([]);
  });

  it("has no next event when there is none upcoming", async () => {
    await insertEvent(db, { eventStatus: "completed", startsAt: daysFromNow(-30) });
    await insertEvent(db, { eventStatus: "cancelled", startsAt: daysFromNow(10) });
    await insertEvent(db, { deletedAt: new Date(), startsAt: daysFromNow(5) });

    expect((await getDashboard(db)).nextEvent).toBeNull();
  });

  it("the next event is the nearest upcoming one, with its fight count, even while it is still a draft", async () => {
    await seedRankings(db);
    const far = await insertEvent(db, { name: "Lejano", startsAt: daysFromNow(60) });
    const near = await insertEvent(db, { name: "Próximo borrador", status: "draft", startsAt: daysFromNow(5) });
    const segment = await insertSegment(db, near.id);
    const [red, blue, other] = [await fighterIdBySlug(db, "bryan-cevallos"), await fighterIdBySlug(db, "jordan-quinonez"), await fighterIdBySlug(db, "mishel-caicedo")];
    await insertBout(db, { eventId: near.id, segmentId: segment, redFighterId: red, blueFighterId: blue });
    await insertBout(db, { eventId: near.id, segmentId: segment, redFighterId: other, blueFighterId: await fighterIdBySlug(db, "daniela-pazmino") });

    const { nextEvent } = await getDashboard(db);

    expect(nextEvent).toMatchObject({ id: near.id, name: "Próximo borrador", boutsCount: 2 });
    expect(nextEvent?.startsAt.getTime()).toBeGreaterThan(Date.now());
    expect(nextEvent?.id).not.toBe(far.id);
  });

  it("counts the messages of the inbox that nobody has answered", async () => {
    const message = { kind: "sponsorship" as const, name: "Marca", email: "a@b.cl", payload: { contactName: "Ana", message: null }, consentAt: new Date() };
    await db.insert(inboxMessages).values([message, message, { ...message, status: "contacted" }]);

    expect((await getDashboard(db)).newInbox).toBe(2);
  });

  it("warns about a ranked fighter the site no longer shows", async () => {
    await seedRankings(db);
    await db.update(fighters).set({ careerStatus: "inactive" }).where(eq(fighters.slug, "jordan-quinonez"));

    const { rankingWarnings } = await getDashboard(db);

    expect(rankingWarnings.some((warning) => warning.includes("Jordan Quiñónez") && warning.includes("inactivo"))).toBe(true);
  });

  it("is all empty on a new installation", async () => {
    expect(await getDashboard(db)).toEqual({ nextEvent: null, newInbox: 0, drafts: [], scheduled: [], rankingWarnings: [] });
  });
});
