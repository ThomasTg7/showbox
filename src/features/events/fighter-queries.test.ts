import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { fighters } from "@/db/schema/fighters";
import { computeRecord } from "@/domain/record";
import { createFighter, setFighterPublication } from "@/features/fighters/service";
import { divisionIdBySlug, insertMedia, validFighterInput } from "@/features/fighters/test-helpers";
import { createTestDb } from "@/test/db";
import { getFighterFightHistory, getFighterNextBout, listBoutsForRecord } from "./fighter-queries";
import { seedEvents } from "./seed";
import { daysFromNow, fighterIdBySlug, insertBout, insertEvent, insertSegment } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;
let perezId: string;
let sotoId: string;
let newcomerId: string;

// Jordan Quiñónez tiene tres peleas terminadas en la promotora (2-1-0); Bryan Cevallos ninguna, solo la programada de ShowBox Fight Night 5.
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedEvents(db);
  perezId = await fighterIdBySlug(db, "bryan-cevallos");
  sotoId = await fighterIdBySlug(db, "jordan-quinonez");
  const newcomer = await createFighter(db, validFighterInput(await divisionIdBySlug(db, "peso-superligero"), { firstName: "Nuevo", lastName: "Ingreso" }), "admin-1");
  await setFighterPublication(db, newcomer.id, { status: "published", publishAt: null }, "admin-1");
  newcomerId = newcomer.id;
  const quinonez = sotoId;

  // Peleas con resultado que no deben contar: evento en borrador, en la papelera y programado a futuro.
  const finished = {
    boutStatus: "completed",
    outcome: "blue_win",
    method: "decision",
    decisionType: "unanimous",
    endRound: 3,
    endTimeSeconds: 300,
  } as const;
  const hiddenEvents = [
    await insertEvent(db, { slug: "oculto-borrador", status: "draft", startsAt: daysFromNow(-10) }),
    await insertEvent(db, { slug: "oculto-papelera", deletedAt: new Date(), startsAt: daysFromNow(-11) }),
    await insertEvent(db, { slug: "oculto-programado", status: "scheduled", publishAt: daysFromNow(3), startsAt: daysFromNow(-12) }),
  ];
  for (const event of hiddenEvents) {
    await insertBout(db, { eventId: event.id, segmentId: await insertSegment(db, event.id), redFighterId: perezId, blueFighterId: quinonez, ...finished });
  }
});
afterAll(() => close());

describe("listBoutsForRecord", () => {
  it("returns only finished fights of public events", async () => {
    const rows = await listBoutsForRecord(db, sotoId);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.date instanceof Date)).toBe(true);
    // Quiñónez pelea de rojo en dos y de azul en una (la que perdió): el récord la lee bien desde cualquier esquina.
    expect(rows.filter((row) => row.blueFighterId === sotoId)).toHaveLength(1);
  });

  it("feeds computeRecord: two wins and a loss for Quiñónez, in the promotion", async () => {
    const record = computeRecord(await listBoutsForRecord(db, sotoId), sotoId, "pro");
    expect([record.wins, record.losses, record.draws]).toEqual([2, 1, 0]);
    expect(record.streak).toEqual({ type: "win", count: 1 });
  });

  it("does not count the fights of a draft, trashed or not yet public event (Cevallos only has those)", async () => {
    expect(await listBoutsForRecord(db, perezId)).toEqual([]);
  });

  it("keeps amateur and pro fights apart", async () => {
    const cortes = await fighterIdBySlug(db, "daniela-pazmino");
    const rows = await listBoutsForRecord(db, cortes);
    expect(computeRecord(rows, cortes, "amateur").draws).toBe(1);
    expect(computeRecord(rows, cortes, "pro").draws).toBe(0);
  });

  it("is empty for a fighter without fights", async () => {
    expect(await listBoutsForRecord(db, newcomerId)).toEqual([]);
  });
});

describe("getFighterFightHistory", () => {
  it("lists the finished fights of public events, newest first", async () => {
    const history = await getFighterFightHistory(db, sotoId);
    expect(history.map((row) => row.eventSlug)).toEqual(["showbox-fight-night-4", "showbox-fight-night-2", "showbox-fight-night-1"]);
    expect(history.map((row) => row.fighterResult)).toEqual(["win", "loss", "win"]);
    expect(await getFighterFightHistory(db, perezId)).toEqual([]);
  });

  it("describes each fight from the fighter's point of view", async () => {
    const [knockout, loss, decision] = await getFighterFightHistory(db, sotoId);
    expect(knockout).toMatchObject({ opponent: { lastName: "Andrango", isPublic: true }, methodText: "KO", roundTime: "R7 2:03", level: "pro" });
    expect(loss).toMatchObject({ opponent: { lastName: "Andrango" }, methodText: "Decisión dividida" });
    expect(decision).toMatchObject({ methodText: "Decisión unánime", roundTime: null });
  });

  it("carries the date as ISO text and the event name", async () => {
    const [latest] = await getFighterFightHistory(db, sotoId);
    expect(latest!.eventName).toBe("ShowBox Fight Night 4");
    expect(new Date(latest!.date).toISOString()).toBe(latest!.date);
    expect(JSON.parse(JSON.stringify(latest))).toEqual(latest);
  });

  it("shows draws and no contests with their own label", async () => {
    const cortes = await getFighterFightHistory(db, await fighterIdBySlug(db, "daniela-pazmino"));
    expect(cortes.map((row) => row.fighterResult).sort()).toEqual(["draw", "loss", "no_contest"]);
  });

  it("is empty for a fighter without fights", async () => {
    expect(await getFighterFightHistory(db, newcomerId)).toEqual([]);
  });
});

describe("getFighterNextBout", () => {
  it("returns the next scheduled fight of a public event", async () => {
    const next = await getFighterNextBout(db, perezId);
    expect(next).toMatchObject({ isTitleFight: true, scheduledRounds: 12, opponent: { lastName: "Quiñónez" }, event: { slug: "showbox-fight-night-5", name: "ShowBox Fight Night 5" } });
    expect(new Date(next!.event.startsAt).toISOString()).toBe(next!.event.startsAt);
    expect(await getFighterNextBout(db, sotoId)).toMatchObject({ opponent: { lastName: "Cevallos" }, isTitleFight: true });
  });

  it("brings both photos of the opponent, so a missing headshot falls back to the body photo", async () => {
    const bodyId = await insertMedia(db, "fighter_body");
    await db.update(fighters).set({ headshotMediaId: null, bodyMediaId: bodyId }).where(eq(fighters.id, sotoId));
    const next = await getFighterNextBout(db, perezId);
    expect(next?.opponent.headshotMedia).toBeNull();
    expect(next?.opponent.bodyMedia?.id).toBe(bodyId);
    const [knockout] = await getFighterFightHistory(db, await fighterIdBySlug(db, "kevin-andrango"));
    expect(knockout?.opponent).toHaveProperty("bodyMedia");
  });

  it("names the division, or the catch weight when there is one", async () => {
    expect((await getFighterNextBout(db, perezId))?.divisionName).toBe("Superligero");
    const catchweight = await getFighterNextBout(db, await fighterIdBySlug(db, "andres-tapia"));
    expect(catchweight).toMatchObject({ divisionName: null, catchweightKg: 65 });
  });

  it("is null when the fighter has nothing scheduled", async () => {
    expect(await getFighterNextBout(db, await fighterIdBySlug(db, "patricio-ortiz"))).toBeNull();
    expect(await getFighterNextBout(db, newcomerId)).toBeNull();
  });
});
