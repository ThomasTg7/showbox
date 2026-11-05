import { count, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { bouts } from "@/db/schema/events";
import { insertBout, insertEvent, insertSegment, fighterIdBySlug } from "@/features/events/test-helpers";
import { seedEvents } from "@/features/events/seed";
import { createTestDb } from "@/test/db";
import { getHomeStats } from "./queries";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe("getHomeStats", () => {
  it("counts the finished events and their finished fights, and the rounds fought and the ones that ended by KO/TKO/RTD", async () => {
    await seedEvents(db);
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
    const stats = await getHomeStats(db);

    // Lo esperado se cuenta aparte, directo de las peleas del seed.
    const [finished] = await db.select({ total: count() }).from(bouts).where(inArray(bouts.boutStatus, ["completed"]));
    const [koTko] = await db.select({ total: count() }).from(bouts).where(inArray(bouts.method, ["ko_tko"]));
    expect(cevallos).not.toBe(quinonez);
    expect(stats.events).toBeGreaterThan(0);
    expect(stats.bouts).toBe(finished!.total);
    expect(stats.koTko).toBe(koTko!.total);
    const [rounds] = await db.select({ total: sql<number>`coalesce(sum(${bouts.endRound}), 0)::int` }).from(bouts).where(eq(bouts.boutStatus, "completed"));
    expect(stats.rounds).toBe(rounds!.total);
  });

  it("only counts completed public events: not drafts, the trash, scheduled or live ones, nor cancelled and unfinished fights", async () => {
    const fresh = await createTestDb();
    try {
      const database = fresh.db;
      const red = await fighterIdBySlugAfterSeed(database, "bryan-cevallos");
      const blue = await fighterIdBySlugAfterSeed(database, "jordan-quinonez");
      const finished = (method: "ko_tko" | "technical_decision" | "decision", endRound = 1) => ({ boutStatus: "completed" as const, outcome: "red_win" as const, method, endRound, endTimeSeconds: 60 });

      const counted = await insertEvent(database, { eventStatus: "completed", startsAt: new Date("2026-01-10T20:00:00Z") });
      const segment = await insertSegment(database, counted.id);
      for (const row of [finished("ko_tko", 2), finished("ko_tko", 4), finished("decision", 6), { boutStatus: "cancelled" as const }, {}]) {
        await insertBout(database, { eventId: counted.id, segmentId: segment, redFighterId: red, blueFighterId: blue, ...row });
      }
      for (const overrides of [{ status: "draft" as const }, { deletedAt: new Date() }, { eventStatus: "scheduled" as const }, { eventStatus: "live" as const }]) {
        const hidden = await insertEvent(database, { eventStatus: "completed", startsAt: new Date("2026-01-11T20:00:00Z"), ...overrides });
        await insertBout(database, { eventId: hidden.id, segmentId: await insertSegment(database, hidden.id), redFighterId: red, blueFighterId: blue, ...finished("ko_tko") });
      }

      expect(await getHomeStats(database)).toEqual({ events: 1, bouts: 3, rounds: 12, koTko: 2 });
    } finally {
      await fresh.close();
    }
  });

  it("is all zeros with no finished events", async () => {
    const empty = await createTestDb();
    try {
      expect(await getHomeStats(empty.db)).toEqual({ events: 0, bouts: 0, rounds: 0, koTko: 0 });
    } finally {
      await empty.close();
    }
  });
});

async function fighterIdBySlugAfterSeed(database: Db, slug: string): Promise<string> {
  const { seedFighters } = await import("@/features/fighters/seed");
  await seedFighters(database);
  return fighterIdBySlug(database, slug);
}
