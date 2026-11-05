import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { bouts, events } from "@/db/schema/events";
import { computeRecord } from "@/domain/record";
import type { BoutResultInput } from "@/domain/bout-result";
import { addBout, cancelBout, saveSegment } from "@/features/events/card-service";
import { listBoutsForRecord } from "@/features/events/fighter-queries";
import { createEvent, deleteEvent } from "@/features/events/service";
import { validEventInput } from "@/features/events/test-helpers";
import { createFighter } from "@/features/fighters/service";
import { divisionIdBySlug, validFighterInput } from "@/features/fighters/test-helpers";
import { createTestDb } from "@/test/db";
import { clearBoutResult, overturnResult, recordBoutResult, startLiveEvent } from "./service";

let db: Db;
let close: () => Promise<void>;
let ligero: string;
let paja: string;
let counter = 0;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  ligero = await divisionIdBySlug(db, "peso-superligero");
  paja = await divisionIdBySlug(db, "peso-mosca-femenino");
});
afterAll(() => close());

const MISSING = "00000000-0000-4000-8000-000000000000";

async function newFighter(label: string): Promise<string> {
  return (await createFighter(db, validFighterInput(ligero, { firstName: label, lastName: `Apellido${counter}` }), "admin-1")).id;
}

/** Evento publicado con bloques Estelar (0) y Preliminares (1) y `pairs` peleas en cada uno. */
async function scenario(pairs = 2) {
  counter += 1;
  const event = await createEvent(db, validEventInput({ name: `Noche ${counter}`, status: "published" }), "admin-1");
  const estelar = (await saveSegment(db, event.id, { name: "Cartelera estelar" }, "admin-1")).id;
  const prelim = (await saveSegment(db, event.id, { name: "Preliminares" }, "admin-1")).id;

  const fighters: string[] = [];
  const main: string[] = [];
  const undercard: string[] = [];
  for (const [segment, list] of [[estelar, main], [prelim, undercard]] as const) {
    for (let index = 0; index < pairs; index += 1) {
      const red = await newFighter(`R${index}`);
      const blue = await newFighter(`B${index}`);
      fighters.push(red, blue);
      list.push((await addBout(db, segment, { redFighterId: red, blueFighterId: blue, divisionId: ligero, scheduledRounds: 3, roundSeconds: 180 }, "admin-1")).id);
    }
  }
  return { eventId: event.id, main, undercard, fighters };
}

const decision: BoutResultInput = { outcome: "red_win", method: "decision", decisionType: "unanimous" };

async function boutRow(id: string) {
  return (await db.select().from(bouts).where(eq(bouts.id, id)))[0]!;
}
const eventStatusOf = async (id: string) => (await db.select({ status: events.eventStatus }).from(events).where(eq(events.id, id)))[0]!.status;
const auditFor = (entityId: string) => db.select().from(auditLog).where(eq(auditLog.entityId, entityId));

async function record(boutId: string, input: BoutResultInput) {
  const result = await recordBoutResult(db, boutId, input, "admin-1");
  if (!result.ok) throw new Error(`unexpected errors: ${JSON.stringify(result.errors)}`);
  return result;
}

describe("recordBoutResult", () => {
  it("saves a valid result, completes the fight and feeds the record", async () => {
    const { main, fighters } = await scenario();
    const boutId = main[0]!;
    await record(boutId, decision);

    expect(await boutRow(boutId)).toMatchObject({ boutStatus: "completed", outcome: "red_win", method: "decision", decisionType: "unanimous", endRound: 3, endTimeSeconds: 180 });
    const record1 = computeRecord(await listBoutsForRecord(db, fighters[0]!), fighters[0]!, "pro");
    expect([record1.wins, record1.losses]).toEqual([1, 0]);
    expect((await auditFor(boutId)).map((entry) => entry.action)).toContain("result");
  });

  it("stores every detail of a retirement in the corner (RTD)", async () => {
    const { main } = await scenario();
    await record(main[0]!, {
      outcome: "blue_win",
      method: "ko_tko",
      koTkoType: "rtd",
      endRound: 2,
      endTimeSeconds: 180,
      referee: "Ricardo Salas",
      bonuses: ["ko_of_night"],
      videoUrl: "https://youtu.be/abc",
      notes: "Tercer round cancelado",
    });
    expect(await boutRow(main[0]!)).toMatchObject({
      outcome: "blue_win",
      method: "ko_tko",
      koTkoType: "rtd",
      endRound: 2,
      endTimeSeconds: 180,
      referee: "Ricardo Salas",
      bonuses: ["ko_of_night"],
      decisionType: null,
    });
  });

  it("returns the field errors and saves nothing when the result is not valid", async () => {
    const { main } = await scenario();
    const result = await recordBoutResult(db, main[0]!, { outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: 4, endTimeSeconds: 30 }, "admin-1");
    expect(result).toEqual({ ok: false, errors: { endRound: "El round no puede ser mayor a 3" } });
    expect(await boutRow(main[0]!)).toMatchObject({ boutStatus: "scheduled", outcome: null });
    expect(await auditFor(main[0]!)).toHaveLength(1);
  });

  it("corrects a saved result without duplicating it, audits the update with the diff and recalculates the record", async () => {
    const { main, fighters } = await scenario();
    const boutId = main[0]!;
    await record(boutId, decision);
    await record(boutId, { outcome: "blue_win", method: "ko_tko", koTkoType: "tko_referee", endRound: 1, endTimeSeconds: 45 });

    const rows = await listBoutsForRecord(db, fighters[0]!);
    expect(rows).toHaveLength(1);
    const red = computeRecord(rows, fighters[0]!, "pro");
    const blue = computeRecord(rows, fighters[1]!, "pro");
    expect([red.wins, red.losses, blue.wins, blue.losses]).toEqual([0, 1, 1, 0]);

    const updates = (await auditFor(boutId)).filter((entry) => entry.action === "update");
    expect(updates).toHaveLength(1);
    expect(updates[0]!.diff).toMatchObject({ antes: { outcome: "red_win", method: "decision" }, despues: { outcome: "blue_win", method: "ko_tko" } });
  });

  it("does not record a cancelled fight or one of an event in the trash", async () => {
    const one = await scenario();
    await cancelBout(db, one.main[0]!, "Lesión", "admin-1");
    await expect(recordBoutResult(db, one.main[0]!, decision, "admin-1")).rejects.toThrow("Esta pelea está cancelada");

    const other = await scenario();
    await deleteEvent(db, other.eventId, "admin-1");
    await expect(recordBoutResult(db, other.main[0]!, decision, "admin-1")).rejects.toThrow("No se encontró el evento");
    await expect(recordBoutResult(db, MISSING, decision, "admin-1")).rejects.toThrow("No se encontró la pelea");
  });
});

describe("the event and the next fight", () => {
  it("completes the event when the last pending fight is recorded, going through the night order", async () => {
    const { eventId, main, undercard } = await scenario();
    // Orden de la noche: preliminares primero (la última de la lista al principio) y la estelar al final.
    const [p0, p1] = undercard as [string, string];
    const [e0, e1] = main as [string, string];

    expect((await record(p1, decision)).nextBoutId).toBe(p0);
    expect((await record(p0, decision)).nextBoutId).toBe(e1);
    expect(await eventStatusOf(eventId)).toBe("scheduled");
    expect((await record(e1, decision)).nextBoutId).toBe(e0);
    const last = await record(e0, decision);
    expect(last.nextBoutId).toBeNull();
    expect(await eventStatusOf(eventId)).toBe("completed");
  });

  it("skips cancelled fights, and completes the event without waiting for them", async () => {
    const { eventId, main, undercard } = await scenario(1);
    await cancelBout(db, undercard[0]!, null, "admin-1");
    const result = await record(main[0]!, decision);
    expect(result.nextBoutId).toBeNull();
    expect(await eventStatusOf(eventId)).toBe("completed");
  });

  it("keeps a completed event completed when a result is corrected", async () => {
    const { eventId, main, undercard } = await scenario(1);
    await record(undercard[0]!, decision);
    await record(main[0]!, decision);
    expect(await eventStatusOf(eventId)).toBe("completed");
    await record(main[0]!, { ...decision, decisionType: "split" });
    expect(await eventStatusOf(eventId)).toBe("completed");
  });
});

describe("title fights", () => {
  async function titleBout(overrides: { divisionId?: string | null; catchweightKg?: number; level?: "pro" | "amateur"; championCorner?: "red" | "blue" } = {}) {
    const { main, fighters } = await scenario(1);
    await db
      .update(bouts)
      .set({ isTitleFight: true, championCorner: overrides.championCorner ?? "red", level: overrides.level ?? "pro", divisionId: overrides.divisionId === undefined ? paja : overrides.divisionId, catchweightKg: overrides.catchweightKg ?? null })
      .where(eq(bouts.id, main[0]!));
    return { boutId: main[0]!, red: fighters[0]!, blue: fighters[1]! };
  }

  it("proposes the challenger (blue corner) as the new champion", async () => {
    const { boutId, blue } = await titleBout({ level: "amateur" });
    const result = await record(boutId, { outcome: "blue_win", method: "ko_tko", koTkoType: "ko", endRound: 2, endTimeSeconds: 100 });
    expect(result.titleChange).toEqual({ divisionId: paja, level: "amateur", newChampionId: blue });
  });

  it("follows the champion's corner: with the champion in the blue corner, the red corner is the challenger", async () => {
    const redChallenger = await titleBout({ championCorner: "blue" });
    const won = await record(redChallenger.boutId, { outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: 1, endTimeSeconds: 40 });
    expect(won.titleChange).toEqual({ divisionId: paja, level: "pro", newChampionId: redChallenger.red });

    const blueChampion = await titleBout({ championCorner: "blue" });
    expect((await record(blueChampion.boutId, { outcome: "blue_win", method: "decision", decisionType: "unanimous" })).titleChange).toBeNull();

    const redChampion = await titleBout({ championCorner: "red" });
    expect((await record(redChampion.boutId, { outcome: "red_win", method: "decision", decisionType: "unanimous" })).titleChange).toBeNull();
  });

  it("proposes nothing when the champion wins, on a draw or a no contest, or without a division", async () => {
    const champion = await titleBout();
    expect((await record(champion.boutId, decision)).titleChange).toBeNull();

    const draw = await titleBout();
    expect((await record(draw.boutId, { outcome: "draw", method: "decision", decisionType: "majority" })).titleChange).toBeNull();

    const noContest = await titleBout();
    expect((await record(noContest.boutId, { outcome: "no_contest", method: "no_contest", ncReason: "accidental_foul", endRound: 1, endTimeSeconds: 30 })).titleChange).toBeNull();

    const catchweight = await titleBout({ divisionId: null, catchweightKg: 72.5 });
    expect((await record(catchweight.boutId, { outcome: "blue_win", method: "decision", decisionType: "split" })).titleChange).toBeNull();
  });

  it("proposes nothing for a non-title fight won by the blue corner", async () => {
    const { main } = await scenario(1);
    expect((await record(main[0]!, { outcome: "blue_win", method: "decision", decisionType: "split" })).titleChange).toBeNull();
  });
});

describe("clearBoutResult", () => {
  it("returns the fight to scheduled, out of the record, and audits", async () => {
    const { main, fighters } = await scenario(1);
    await record(main[0]!, decision);
    await clearBoutResult(db, main[0]!, "admin-1");

    expect(await boutRow(main[0]!)).toMatchObject({ boutStatus: "scheduled", outcome: null, method: null, endRound: null, endTimeSeconds: null, decisionType: null, bonuses: [] });
    expect(await listBoutsForRecord(db, fighters[0]!)).toEqual([]);
    expect((await auditFor(main[0]!)).map((entry) => entry.summary).join("|")).toContain("Borró el resultado");
  });

  it("says when there is nothing to clear", async () => {
    const { main } = await scenario(1);
    await expect(clearBoutResult(db, main[0]!, "admin-1")).rejects.toThrow("Esta pelea no tiene resultado");
    await expect(clearBoutResult(db, MISSING, "admin-1")).rejects.toThrow("No se encontró la pelea");
  });

  it("lets the fight be cancelled once its result is cleared", async () => {
    const { main } = await scenario(1);
    await record(main[0]!, decision);
    await expect(cancelBout(db, main[0]!, null, "admin-1")).rejects.toThrow("Primero borra el resultado");
    await clearBoutResult(db, main[0]!, "admin-1");
    await expect(cancelBout(db, main[0]!, null, "admin-1")).resolves.toBeUndefined();
  });
});

describe("overturnResult", () => {
  it("turns the result into a no contest and keeps the original", async () => {
    const { main, fighters } = await scenario(1);
    await record(main[0]!, { outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: 1, endTimeSeconds: 40, referee: "Salas" });
    await overturnResult(db, main[0]!, "Dopaje del ganador", "admin-1");

    const row = await boutRow(main[0]!);
    expect(row).toMatchObject({ boutStatus: "completed", outcome: "no_contest", method: "no_contest", ncReason: "overturned", ncNote: "Dopaje del ganador", koTkoType: null, endRound: 1, endTimeSeconds: 40, referee: "Salas" });
    expect(row.overturnedFrom).toMatchObject({ outcome: "red_win", method: "ko_tko", koTkoType: "ko", note: "Dopaje del ganador" });

    const record1 = computeRecord(await listBoutsForRecord(db, fighters[0]!), fighters[0]!, "pro");
    expect([record1.wins, record1.noContests]).toEqual([0, 1]);
  });

  it("asks for a note, refuses to overturn twice or a fight without result", async () => {
    const { main } = await scenario(1);
    await expect(overturnResult(db, main[0]!, "x", "admin-1")).rejects.toThrow("Esta pelea no tiene resultado");
    await record(main[0]!, decision);
    await expect(overturnResult(db, main[0]!, "   ", "admin-1")).rejects.toThrow("Explica por qué se anula");
    await overturnResult(db, main[0]!, "Error de mesa", "admin-1");
    await expect(overturnResult(db, main[0]!, "Otra vez", "admin-1")).rejects.toThrow("Este resultado ya fue anulado");
  });

  it("forgets the overturn when a new result is recorded", async () => {
    const { main } = await scenario(1);
    await record(main[0]!, decision);
    await overturnResult(db, main[0]!, "Error de mesa", "admin-1");
    await record(main[0]!, { ...decision, outcome: "blue_win" });
    expect(await boutRow(main[0]!)).toMatchObject({ outcome: "blue_win", overturnedFrom: null });
  });

  it("keeps the original when the overturned result is saved again, for example to add the video", async () => {
    const { main } = await scenario(1);
    await record(main[0]!, decision);
    await overturnResult(db, main[0]!, "Error de mesa", "admin-1");
    await record(main[0]!, { outcome: "no_contest", method: "no_contest", ncReason: "overturned", ncNote: "Error de mesa", endRound: 3, endTimeSeconds: 180, videoUrl: "https://www.youtube.com/watch?v=abc123" });

    const row = await boutRow(main[0]!);
    expect(row).toMatchObject({ ncReason: "overturned", videoUrl: "https://www.youtube.com/watch?v=abc123" });
    expect(row.overturnedFrom).toMatchObject({ outcome: "red_win", method: "decision", note: "Error de mesa" });
  });

  it("does not let «Resultado anulado» be chosen by hand: that is what «Anular resultado» is for", async () => {
    const { main } = await scenario(1);
    const result = await recordBoutResult(db, main[0]!, { outcome: "no_contest", method: "no_contest", ncReason: "overturned", endRound: 1, endTimeSeconds: 30 }, "admin-1");
    expect(result).toMatchObject({ ok: false, errors: { ncReason: expect.stringContaining("Anular resultado") } });
    expect(await boutRow(main[0]!)).toMatchObject({ outcome: null });
  });
});

describe("startLiveEvent", () => {
  it("puts a scheduled event live once and audits it", async () => {
    const { eventId } = await scenario(1);
    await startLiveEvent(db, eventId, "admin-1");
    await startLiveEvent(db, eventId, "admin-1");
    expect(await eventStatusOf(eventId)).toBe("live");
    expect((await auditFor(eventId)).filter((entry) => entry.summary.includes("en vivo"))).toHaveLength(1);
  });

  it("leaves a finished event as it is, refuses a cancelled or missing one", async () => {
    const finished = await scenario(1);
    await db.update(events).set({ eventStatus: "completed" }).where(eq(events.id, finished.eventId));
    await startLiveEvent(db, finished.eventId, "admin-1");
    expect(await eventStatusOf(finished.eventId)).toBe("completed");

    const cancelled = await scenario(1);
    await db.update(events).set({ eventStatus: "cancelled" }).where(eq(events.id, cancelled.eventId));
    await expect(startLiveEvent(db, cancelled.eventId, "admin-1")).rejects.toThrow("El evento está cancelado");
    await expect(startLiveEvent(db, MISSING, "admin-1")).rejects.toThrow("No se encontró el evento");
  });
});
