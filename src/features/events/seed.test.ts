import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { bouts, events } from "@/db/schema/events";
import { createTestDb } from "@/test/db";
import { seedEvents } from "./seed";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedEvents(db);
});
afterAll(() => close());

describe("seedEvents", () => {
  it("uses ShowBox event names and public URLs", async () => {
    const rows = await db.select({ name: events.name, slug: events.slug }).from(events).orderBy(events.number);
    expect(rows).toEqual([1, 2, 3, 4, 5].map((number) => ({ name: `ShowBox Fight Night ${number}`, slug: `showbox-fight-night-${number}` })));
  });
  it("creates four finished events and one upcoming, all published", async () => {
    const rows = await db.select({ number: events.number, eventStatus: events.eventStatus, status: events.status }).from(events).orderBy(events.number);
    expect(rows.map((row) => row.eventStatus)).toEqual(["completed", "completed", "completed", "completed", "scheduled"]);
    expect(rows.every((row) => row.status === "published")).toBe(true);
  });

  it("is idempotent", async () => {
    await seedEvents(db);
    const [{ total: eventTotal }] = await db.select({ total: count() }).from(events);
    const [{ total: boutTotal }] = await db.select({ total: count() }).from(bouts);
    expect([eventTotal, boutTotal]).toEqual([5, 21]);
  });

  it("covers every way a fight can end, all as valid results", async () => {
    const finished = await db.select({ outcome: bouts.outcome, method: bouts.method }).from(bouts).where(eq(bouts.boutStatus, "completed"));
    expect(new Set(finished.map((row) => row.method))).toEqual(
      new Set(["ko_tko", "decision", "technical_decision", "disqualification", "no_contest"]),
    );
    expect(new Set(finished.map((row) => row.outcome))).toEqual(new Set(["red_win", "blue_win", "draw", "no_contest"]));
    expect(finished).toHaveLength(16);
  });

  it("uses boxing rounds: 3-minute rounds (2 for women) and 3 to 12 scheduled rounds", async () => {
    const rows = await db.select({ rounds: bouts.scheduledRounds, seconds: bouts.roundSeconds }).from(bouts);
    expect(rows.every((row) => [3, 4, 5, 6, 8, 10, 12].includes(row.rounds))).toBe(true);
    expect(new Set(rows.map((row) => row.seconds))).toEqual(new Set([120, 180]));
    expect(rows.some((row) => row.rounds === 12)).toBe(true);
  });

  it("leaves the upcoming card without results", async () => {
    const [upcoming] = await db.select({ id: events.id }).from(events).where(eq(events.slug, "showbox-fight-night-5"));
    const rows = await db.select({ boutStatus: bouts.boutStatus, outcome: bouts.outcome }).from(bouts).where(eq(bouts.eventId, upcoming!.id));
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.boutStatus === "scheduled" && row.outcome === null)).toBe(true);
  });
});

