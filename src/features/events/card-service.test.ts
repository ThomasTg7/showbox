import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { bouts, cardSegments, events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { createFighter, deleteFighter } from "@/features/fighters/service";
import { divisionIdBySlug, validFighterInput } from "@/features/fighters/test-helpers";
import { purgeExpired } from "@/features/trash/trash";
import { toLocalInputs } from "@/lib/local-time";
import { createTestDb } from "@/test/db";
import { addBout, cancelBout, deleteBout, deleteSegment, moveBout, reinstateBout, reorderSegments, saveSegment, updateBout } from "./card-service";
import { createEvent, deleteEvent } from "./service";
import { validEventInput } from "./test-helpers";

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

async function newFighter(firstName: string, lastName = "Prueba"): Promise<string> {
  return (await createFighter(db, validFighterInput(ligero, { firstName, lastName }), "admin-1")).id;
}

/** Un evento con dos bloques y cuatro boxeadores nuevos. */
async function scenario() {
  counter += 1;
  const event = await createEvent(db, validEventInput({ name: `Evento ${counter}` }), "admin-1");
  const estelar = (await saveSegment(db, event.id, { name: "Cartelera estelar" }, "admin-1")).id;
  const prelim = (await saveSegment(db, event.id, { name: "Preliminares" }, "admin-1")).id;
  const [a, b, c, d] = await Promise.all([`A${counter}`, `B${counter}`, `C${counter}`, `D${counter}`].map((name) => newFighter(name)));
  return { eventId: event.id, estelar, prelim, a: a!, b: b!, c: c!, d: d! };
}

const versus = (red: string, blue: string) => ({ redFighterId: red, blueFighterId: blue, divisionId: ligero });

async function order(segmentId: string): Promise<string[]> {
  const rows = await db.select({ id: bouts.id }).from(bouts).where(eq(bouts.segmentId, segmentId)).orderBy(asc(bouts.sortOrder));
  return rows.map((row) => row.id);
}

async function sortOrders(segmentId: string): Promise<number[]> {
  const rows = await db.select({ sortOrder: bouts.sortOrder }).from(bouts).where(eq(bouts.segmentId, segmentId)).orderBy(asc(bouts.sortOrder));
  return rows.map((row) => row.sortOrder);
}

const auditActions = async (entityId: string) => (await db.select().from(auditLog).where(eq(auditLog.entityId, entityId))).map((entry) => entry.action);

describe("saveSegment", () => {
  it("appends blocks in order, renames one and audits", async () => {
    const { eventId, estelar, prelim } = await scenario();
    const rows = await db.select().from(cardSegments).where(eq(cardSegments.eventId, eventId)).orderBy(asc(cardSegments.sortOrder));
    expect(rows.map((row) => [row.id, row.sortOrder])).toEqual([[estelar, 0], [prelim, 1]]);

    await saveSegment(db, eventId, { id: prelim, name: "Preliminares en vivo" }, "admin-1");
    const [renamed] = await db.select().from(cardSegments).where(eq(cardSegments.id, prelim));
    expect(renamed!.name).toBe("Preliminares en vivo");
    expect(await auditActions(prelim)).toEqual(["create", "update"]);
  });

  it("reads the start time as Chile time on the day of the event, and clears it", async () => {
    const { eventId, prelim } = await scenario();
    await saveSegment(db, eventId, { id: prelim, name: "Preliminares", startsTime: "20:00" }, "admin-1");
    const [row] = await db.select().from(cardSegments).where(eq(cardSegments.id, prelim));
    expect(toLocalInputs(row!.startsAt!)).toEqual({ date: "2026-11-14", time: "20:00" });

    await saveSegment(db, eventId, { id: prelim, name: "Preliminares", startsTime: "" }, "admin-1");
    expect((await db.select().from(cardSegments).where(eq(cardSegments.id, prelim)))[0]!.startsAt).toBeNull();
    await expect(saveSegment(db, eventId, { name: "Mal", startsTime: "25:99" }, "admin-1")).rejects.toThrow("La hora debe escribirse como HH:mm");
  });

  it("needs a name and refuses a block of another event", async () => {
    const one = await scenario();
    const other = await scenario();
    await expect(saveSegment(db, one.eventId, { name: "  " }, "admin-1")).rejects.toThrow("Escribe el nombre del bloque");
    await expect(saveSegment(db, one.eventId, { id: other.estelar, name: "Robado" }, "admin-1")).rejects.toThrow("No se encontró el bloque");
    await expect(saveSegment(db, MISSING, { name: "Sin evento" }, "admin-1")).rejects.toThrow("No se encontró el evento");
  });
});

describe("reorderSegments and deleteSegment", () => {
  it("reorders the blocks", async () => {
    const { eventId, estelar, prelim } = await scenario();
    await reorderSegments(db, eventId, [prelim, estelar], "admin-1");
    const rows = await db.select({ id: cardSegments.id }).from(cardSegments).where(eq(cardSegments.eventId, eventId)).orderBy(asc(cardSegments.sortOrder));
    expect(rows.map((row) => row.id)).toEqual([prelim, estelar]);
  });

  it("rejects a list that does not have exactly the blocks of the event", async () => {
    const { eventId, estelar } = await scenario();
    await expect(reorderSegments(db, eventId, [estelar], "admin-1")).rejects.toThrow("La lista de bloques cambió");
    await expect(reorderSegments(db, eventId, [estelar, estelar], "admin-1")).rejects.toThrow("La lista de bloques cambió");
  });

  it("refuses to delete a block with fights, and keeps the order of the others contiguous when it deletes one", async () => {
    const { eventId, estelar, prelim, a, b } = await scenario();
    const third = (await saveSegment(db, eventId, { name: "Tercero" }, "admin-1")).id;
    await addBout(db, prelim, versus(a, b), "admin-1");
    await expect(deleteSegment(db, prelim, "admin-1")).rejects.toThrow("Primero mueve o elimina las peleas de este bloque");

    await deleteSegment(db, estelar, "admin-1");
    const rows = await db.select({ id: cardSegments.id, sortOrder: cardSegments.sortOrder }).from(cardSegments).where(eq(cardSegments.eventId, eventId)).orderBy(asc(cardSegments.sortOrder));
    expect(rows).toEqual([{ id: prelim, sortOrder: 0 }, { id: third, sortOrder: 1 }]);
  });
});

describe("addBout", () => {
  it("adds fights at the end of the block with the defaults and audits each one", async () => {
    const { estelar, a, b, c, d } = await scenario();
    const first = await addBout(db, estelar, versus(a, b), "admin-1");
    const second = await addBout(db, estelar, { ...versus(c, d), level: "amateur", scheduledRounds: "5", roundSeconds: "180", isTitleFight: "on" }, "admin-1");
    expect(await order(estelar)).toEqual([first.id, second.id]);

    const [row] = await db.select().from(bouts).where(eq(bouts.id, second.id));
    expect(row).toMatchObject({ level: "amateur", scheduledRounds: 5, roundSeconds: 180, isTitleFight: true, boutStatus: "scheduled" });
    const [defaults] = await db.select().from(bouts).where(eq(bouts.id, first.id));
    expect(defaults).toMatchObject({ level: "pro", scheduledRounds: 6, roundSeconds: 180, isTitleFight: false, sortOrder: 0 });
    expect(await auditActions(first.id)).toEqual(["create"]);
  });

  it("does not let a fighter be in both corners", async () => {
    const { estelar, a } = await scenario();
    await expect(addBout(db, estelar, versus(a, a), "admin-1")).rejects.toThrow("Un boxeador no puede estar en ambas esquinas");
  });

  it("does not let a fighter have two fights in the same event, but lets them fight in another one", async () => {
    const one = await scenario();
    await addBout(db, one.estelar, versus(one.a, one.b), "admin-1");
    await expect(addBout(db, one.prelim, versus(one.a, one.c), "admin-1")).rejects.toThrow(`A${counter} Prueba ya tiene una pelea en este evento`);
    await expect(addBout(db, one.prelim, versus(one.c, one.b), "admin-1")).rejects.toThrow(`B${counter} Prueba ya tiene una pelea en este evento`);

    const other = await scenario();
    await expect(addBout(db, other.estelar, versus(other.a, one.a), "admin-1")).resolves.toBeDefined();
  });

  it("rejects a fighter in the trash or that does not exist, but accepts a draft fighter", async () => {
    const { estelar, a, b, c } = await scenario();
    await deleteFighter(db, c, "admin-1");
    await expect(addBout(db, estelar, versus(a, c), "admin-1")).rejects.toThrow("Ese boxeador está en la papelera");
    await expect(addBout(db, estelar, versus(a, MISSING), "admin-1")).rejects.toThrow("No se encontró al boxeador");
    const [draft] = await db.select({ status: fighters.status }).from(fighters).where(eq(fighters.id, b));
    expect(draft!.status).toBe("draft");
    await expect(addBout(db, estelar, versus(a, b), "admin-1")).resolves.toBeDefined();
  });

  it("asks for a division or a catch weight, and the division must exist", async () => {
    const { estelar, a, b } = await scenario();
    await expect(addBout(db, estelar, { redFighterId: a, blueFighterId: b }, "admin-1")).rejects.toThrow("Elige la división o indica el peso pactado");
    await expect(addBout(db, estelar, { redFighterId: a, blueFighterId: b, divisionId: MISSING }, "admin-1")).rejects.toThrow("Esa división no existe");
    const { id } = await addBout(db, estelar, { redFighterId: a, blueFighterId: b, catchweightKg: "72,5" }, "admin-1");
    expect((await db.select().from(bouts).where(eq(bouts.id, id)))[0]).toMatchObject({ catchweightKg: 72.5, divisionId: null });
  });

  it("only takes boxing rounds (3, 4, 5, 6, 8, 10 or 12), rounds of 1 to 5 minutes and known ids", async () => {
    const { estelar, a, b } = await scenario();
    await expect(addBout(db, estelar, { ...versus(a, b), scheduledRounds: 7 }, "admin-1")).rejects.toThrow("Los rounds deben ser 3, 4, 5, 6, 8, 10, 12");
    await expect(addBout(db, estelar, { ...versus(a, b), scheduledRounds: 15 }, "admin-1")).rejects.toThrow();
    await expect(addBout(db, estelar, { ...versus(a, b), roundSeconds: 30 }, "admin-1")).rejects.toThrow();
    await expect(addBout(db, estelar, { ...versus(a, b), roundSeconds: 400 }, "admin-1")).rejects.toThrow();
    await expect(addBout(db, MISSING, versus(a, b), "admin-1")).rejects.toThrow("No se encontró el bloque");
    await expect(addBout(db, estelar, { ...versus("nope", b), divisionId: paja }, "admin-1")).rejects.toThrow("Elige el boxeador de la esquina roja");
  });

  it("does not touch an event in the trash", async () => {
    const { eventId, estelar, a, b } = await scenario();
    await deleteEvent(db, eventId, "admin-1");
    await expect(addBout(db, estelar, versus(a, b), "admin-1")).rejects.toThrow("No se encontró el evento");
  });
});

describe("updateBout", () => {
  it("changes the fight, and does not count its own fighters as already booked", async () => {
    const { estelar, a, b, c } = await scenario();
    const { id } = await addBout(db, estelar, versus(a, b), "admin-1");
    await updateBout(db, id, { ...versus(a, c), scheduledRounds: 5, isTitleFight: true }, "admin-1");
    expect((await db.select().from(bouts).where(eq(bouts.id, id)))[0]).toMatchObject({ blueFighterId: c, scheduledRounds: 5, isTitleFight: true });
    await updateBout(db, id, versus(a, c), "admin-1");
    expect(await auditActions(id)).toEqual(["create", "update", "update"]);
  });

  it("still applies the corner and event rules", async () => {
    const { estelar, prelim, a, b, c, d } = await scenario();
    const { id } = await addBout(db, estelar, versus(a, b), "admin-1");
    await addBout(db, prelim, versus(c, d), "admin-1");
    await expect(updateBout(db, id, versus(a, a), "admin-1")).rejects.toThrow("Un boxeador no puede estar en ambas esquinas");
    await expect(updateBout(db, id, versus(a, c), "admin-1")).rejects.toThrow("ya tiene una pelea en este evento");
  });

  it("refuses to edit a fight that already has a result, and a missing one", async () => {
    const { estelar, a, b } = await scenario();
    const { id } = await addBout(db, estelar, versus(a, b), "admin-1");
    await db.update(bouts).set({ boutStatus: "completed", outcome: "red_win", method: "decision", endRound: 3, endTimeSeconds: 300 }).where(eq(bouts.id, id));
    await expect(updateBout(db, id, versus(b, a), "admin-1")).rejects.toThrow("Esta pelea ya tiene resultado");
    await expect(updateBout(db, MISSING, versus(a, b), "admin-1")).rejects.toThrow("No se encontró la pelea");
  });
});

describe("moveBout", () => {
  async function three(segmentId: string, fighters: string[]) {
    const ids: string[] = [];
    for (let index = 0; index < fighters.length; index += 2) ids.push((await addBout(db, segmentId, versus(fighters[index]!, fighters[index + 1]!), "admin-1")).id);
    return ids;
  }

  it("moves a fight from block A index 2 to block B index 0 and leaves 0..n-1 in both", async () => {
    const { estelar, prelim, a, b, c, d } = await scenario();
    const extra = await Promise.all([newFighter("E"), newFighter("F"), newFighter("G"), newFighter("H")]);
    const inEstelar = await three(estelar, [a, b, c, d, extra[0]!, extra[1]!]);
    const inPrelim = await three(prelim, [extra[2]!, extra[3]!]);

    await moveBout(db, inEstelar[2]!, { segmentId: prelim, index: 0 }, "admin-1");
    expect(await order(estelar)).toEqual([inEstelar[0], inEstelar[1]]);
    expect(await order(prelim)).toEqual([inEstelar[2], inPrelim[0]]);
    expect(await sortOrders(estelar)).toEqual([0, 1]);
    expect(await sortOrders(prelim)).toEqual([0, 1]);
  });

  it("reorders inside the same block, clamping an index past the end", async () => {
    const { estelar, a, b, c, d } = await scenario();
    const extra = await Promise.all([newFighter("E"), newFighter("F")]);
    const ids = await three(estelar, [a, b, c, d, extra[0]!, extra[1]!]);
    await moveBout(db, ids[0]!, { segmentId: estelar, index: 99 }, "admin-1");
    expect(await order(estelar)).toEqual([ids[1], ids[2], ids[0]]);
    await moveBout(db, ids[0]!, { segmentId: estelar, index: 0 }, "admin-1");
    expect(await order(estelar)).toEqual([ids[0], ids[1], ids[2]]);
    expect(await sortOrders(estelar)).toEqual([0, 1, 2]);
    expect(await auditActions(ids[0]!)).toContain("update");
  });

  it("does not move a fight into a block of another event, or a missing fight", async () => {
    const one = await scenario();
    const other = await scenario();
    const { id } = await addBout(db, one.estelar, versus(one.a, one.b), "admin-1");
    await expect(moveBout(db, id, { segmentId: other.estelar, index: 0 }, "admin-1")).rejects.toThrow("No se encontró el bloque");
    await expect(moveBout(db, MISSING, { segmentId: one.prelim, index: 0 }, "admin-1")).rejects.toThrow("No se encontró la pelea");
  });
});

describe("cancelBout, reinstateBout and deleteBout", () => {
  it("cancels a fight with its reason and lets it back in", async () => {
    const { estelar, a, b } = await scenario();
    const { id } = await addBout(db, estelar, versus(a, b), "admin-1");
    await cancelBout(db, id, "Lesión de un boxeador", "admin-1");
    expect((await db.select().from(bouts).where(eq(bouts.id, id)))[0]).toMatchObject({ boutStatus: "cancelled", cancelReason: "Lesión de un boxeador" });
    await reinstateBout(db, id, "admin-1");
    expect((await db.select().from(bouts).where(eq(bouts.id, id)))[0]).toMatchObject({ boutStatus: "scheduled", cancelReason: null });
  });

  it("frees the fighters of a cancelled fight for another fight of the same event", async () => {
    const { estelar, prelim, a, b, c } = await scenario();
    const { id } = await addBout(db, estelar, versus(a, b), "admin-1");
    await expect(addBout(db, prelim, versus(a, c), "admin-1")).rejects.toThrow("ya tiene una pelea en este evento");
    await cancelBout(db, id, "Lesión", "admin-1");
    await expect(addBout(db, prelim, versus(a, c), "admin-1")).resolves.toBeDefined();
  });

  it("does not reinstate a cancelled fight whose fighter was booked in another fight meanwhile", async () => {
    const { estelar, prelim, a, b, c } = await scenario();
    const { id: old } = await addBout(db, estelar, versus(a, b), "admin-1");
    await cancelBout(db, old, "Lesión", "admin-1");
    await addBout(db, prelim, versus(a, c), "admin-1");

    await expect(reinstateBout(db, old, "admin-1")).rejects.toThrow("ya tiene una pelea en este evento");
    expect((await db.select().from(bouts).where(eq(bouts.id, old)))[0]).toMatchObject({ boutStatus: "cancelled" });
    expect(await auditActions(old)).toEqual(["create", "update"]);
  });

  it("does not audit reinstating a fight that is not cancelled", async () => {
    const { estelar, a, b } = await scenario();
    const { id } = await addBout(db, estelar, versus(a, b), "admin-1");
    await reinstateBout(db, id, "admin-1");
    expect(await auditActions(id)).toEqual(["create"]);
  });

  it("asks to clear the result before cancelling or deleting a finished fight", async () => {
    const { estelar, a, b } = await scenario();
    const { id } = await addBout(db, estelar, versus(a, b), "admin-1");
    await db.update(bouts).set({ boutStatus: "completed", outcome: "red_win", method: "decision", endRound: 3, endTimeSeconds: 300 }).where(eq(bouts.id, id));
    await expect(cancelBout(db, id, null, "admin-1")).rejects.toThrow("Primero borra el resultado");
    await expect(deleteBout(db, id, "admin-1")).rejects.toThrow("Primero borra el resultado");
  });

  it("deletes a fight and keeps the order of the block contiguous", async () => {
    const { estelar, a, b, c, d } = await scenario();
    const extra = await Promise.all([newFighter("E"), newFighter("F")]);
    const ids = [
      (await addBout(db, estelar, versus(a, b), "admin-1")).id,
      (await addBout(db, estelar, versus(c, d), "admin-1")).id,
      (await addBout(db, estelar, versus(extra[0]!, extra[1]!), "admin-1")).id,
    ];
    await deleteBout(db, ids[0]!, "admin-1");
    expect(await order(estelar)).toEqual([ids[1], ids[2]]);
    expect(await sortOrders(estelar)).toEqual([0, 1]);
    expect(await auditActions(ids[0]!)).toEqual(["create", "delete"]);
    await expect(deleteBout(db, ids[0]!, "admin-1")).rejects.toThrow("No se encontró la pelea");
  });
});

describe("the champion's corner", () => {
  const cornerOf = async (id: string) => (await db.select({ championCorner: bouts.championCorner }).from(bouts).where(eq(bouts.id, id)))[0]!.championCorner;

  it("is the red corner by default and can be set to the blue one when adding or editing a title fight", async () => {
    const { estelar, a, b, c, d } = await scenario();
    const { id } = await addBout(db, estelar, { ...versus(a, b), isTitleFight: true }, "admin-1");
    expect(await cornerOf(id)).toBe("red");

    const blueChampion = await addBout(db, estelar, { ...versus(c, d), isTitleFight: true, championCorner: "blue" }, "admin-1");
    expect(await cornerOf(blueChampion.id)).toBe("blue");

    await updateBout(db, id, { ...versus(a, b), isTitleFight: true, championCorner: "blue" }, "admin-1");
    expect(await cornerOf(id)).toBe("blue");
    await updateBout(db, id, { ...versus(a, b), isTitleFight: true }, "admin-1");
    expect(await cornerOf(id)).toBe("red");
  });

  it("rejects a corner that does not exist", async () => {
    const { estelar, a, b } = await scenario();
    await expect(addBout(db, estelar, { ...versus(a, b), championCorner: "verde" as never }, "admin-1")).rejects.toThrow("esquina del campeón");
  });
});

describe("closing the night", () => {
  /** Un evento en vivo con una pelea ya peleada y otra pendiente. */
  async function liveNightWithOnePending(eventStatus: "live" | "scheduled" = "live") {
    const night = await scenario();
    const finished = (await addBout(db, night.prelim, versus(night.a, night.b), "admin-1")).id;
    const pending = (await addBout(db, night.estelar, versus(night.c, night.d), "admin-1")).id;
    await db.update(bouts).set({ boutStatus: "completed", outcome: "red_win", method: "decision", endRound: 3, endTimeSeconds: 300 }).where(eq(bouts.id, finished));
    await db.update(events).set({ eventStatus }).where(eq(events.id, night.eventId));
    return { ...night, finished, pending };
  }

  const eventStatusOf = async (eventId: string) => (await db.select({ eventStatus: events.eventStatus }).from(events).where(eq(events.id, eventId)))[0]!.eventStatus;

  it("finishes the event when the last pending fight is cancelled", async () => {
    const night = await liveNightWithOnePending();
    await cancelBout(db, night.pending, "Lesión", "admin-1");
    expect(await eventStatusOf(night.eventId)).toBe("completed");
    expect(await auditActions(night.eventId)).toContain("update");
  });

  it("finishes the event when the last pending fight is deleted", async () => {
    const night = await liveNightWithOnePending("scheduled");
    await deleteBout(db, night.pending, "admin-1");
    expect(await eventStatusOf(night.eventId)).toBe("completed");
  });

  it("keeps the event open while another fight is still pending", async () => {
    const night = await liveNightWithOnePending();
    const extra = await Promise.all([newFighter("G"), newFighter("H")]);
    await addBout(db, night.estelar, versus(extra[0]!, extra[1]!), "admin-1");
    await cancelBout(db, night.pending, null, "admin-1");
    expect(await eventStatusOf(night.eventId)).toBe("live");
  });

  it("does not finish an event where no fight was ever fought", async () => {
    const { eventId, estelar, a, b } = await scenario();
    await db.update(events).set({ eventStatus: "live" }).where(eq(events.id, eventId));
    const { id } = await addBout(db, estelar, versus(a, b), "admin-1");
    await cancelBout(db, id, null, "admin-1");
    expect(await eventStatusOf(eventId)).toBe("live");
  });

  it("does not reopen or touch a cancelled event", async () => {
    const night = await liveNightWithOnePending();
    await db.update(events).set({ eventStatus: "cancelled" }).where(eq(events.id, night.eventId));
    await cancelBout(db, night.pending, null, "admin-1");
    expect(await eventStatusOf(night.eventId)).toBe("cancelled");
  });
});

describe("fighters and the trash", () => {
  let fresh: Awaited<ReturnType<typeof scenario>>;
  beforeEach(async () => {
    fresh = await scenario();
  });

  it("does not send a fighter with fights to the trash", async () => {
    await addBout(db, fresh.estelar, versus(fresh.a, fresh.b), "admin-1");
    await expect(deleteFighter(db, fresh.a, "admin-1")).rejects.toThrow("Tiene peleas registradas");
    expect((await db.select({ deletedAt: fighters.deletedAt }).from(fighters).where(eq(fighters.id, fresh.a)))[0]!.deletedAt).toBeNull();
    await expect(deleteFighter(db, fresh.c, "admin-1")).resolves.toBeUndefined();
  });

  it("frees a fighter once the fight is deleted", async () => {
    const { id } = await addBout(db, fresh.estelar, versus(fresh.a, fresh.b), "admin-1");
    await deleteBout(db, id, "admin-1");
    await expect(deleteFighter(db, fresh.a, "admin-1")).resolves.toBeUndefined();
  });

  it("purges an event from the trash together with its blocks and fights, leaving the fighters", async () => {
    const { id: boutId } = await addBout(db, fresh.estelar, versus(fresh.a, fresh.b), "admin-1");
    await deleteEvent(db, fresh.eventId, "admin-1");

    const purged = await purgeExpired(db, new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));
    expect(purged).toBeGreaterThanOrEqual(1);
    expect(await db.select().from(events).where(eq(events.id, fresh.eventId))).toEqual([]);
    expect(await db.select().from(cardSegments).where(eq(cardSegments.eventId, fresh.eventId))).toEqual([]);
    expect(await db.select().from(bouts).where(eq(bouts.id, boutId))).toEqual([]);
    expect(await db.select({ id: fighters.id }).from(fighters).where(eq(fighters.id, fresh.a))).toHaveLength(1);
  });

  it("only sends a fighter whose fight is in a trashed event to the trash once that event is purged", async () => {
    await addBout(db, fresh.estelar, versus(fresh.a, fresh.b), "admin-1");
    await deleteEvent(db, fresh.eventId, "admin-1");
    // El mensaje explica dónde está la pelea: en la cartelera no se ve, porque el evento está en la papelera.
    await expect(deleteFighter(db, fresh.a, "admin-1")).rejects.toThrow("Tiene peleas en un evento que está en la papelera");

    await purgeExpired(db, new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));
    await expect(deleteFighter(db, fresh.a, "admin-1")).resolves.toBeUndefined();
  });

  it("keeps the audit trail of every write", async () => {
    const { id } = await addBout(db, fresh.estelar, versus(fresh.a, fresh.b), "admin-1");
    await cancelBout(db, id, null, "admin-1");
    const rows = await db.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(rows.every((row) => row.actorId === "admin-1" && row.summary.length > 0)).toBe(true);
    expect(rows).toHaveLength(2);
  });
});
