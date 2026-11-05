import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { seedEvents } from "./seed";
import { getNextEvent, getPublicEventBySlug, getPublicEventRef, listPublicEvents } from "./queries";
import { createFighter } from "@/features/fighters/service";
import { divisionIdBySlug, validFighterInput } from "@/features/fighters/test-helpers";
import { createTestDb } from "@/test/db";
import { daysFromNow, eventIdBySlug, fighterIdBySlug, insertBout, insertEvent, insertSegment } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedEvents(db);

  const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
  const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
  const versus = { redFighterId: cevallos, blueFighterId: quinonez } as const;

  const draft = await insertEvent(db, { name: "Evento borrador", slug: "evento-borrador", status: "draft" });
  await insertBout(db, { eventId: draft.id, segmentId: await insertSegment(db, draft.id), ...versus });

  const trashed = await insertEvent(db, { name: "Evento en la papelera", slug: "evento-papelera", deletedAt: new Date() });
  await insertSegment(db, trashed.id);

  await insertEvent(db, { name: "Evento programado", slug: "evento-programado", status: "scheduled", publishAt: daysFromNow(10) });
  await insertEvent(db, { name: "Evento cercano", slug: "evento-cercano", startsAt: daysFromNow(5) });
  await insertEvent(db, { name: "Evento lejano", slug: "evento-lejano", startsAt: daysFromNow(90) });
  await insertEvent(db, { name: "Evento en vivo", slug: "evento-en-vivo", startsAt: daysFromNow(-0.1), eventStatus: "live" });
  await insertEvent(db, { name: "Evento olvidado", slug: "evento-olvidado", startsAt: daysFromNow(-3) });
  await insertEvent(db, { name: "Evento recién terminado", slug: "evento-terminado", startsAt: daysFromNow(-0.05), eventStatus: "completed" });
});
afterAll(() => close());

const names = (items: { name: string }[]) => items.map((event) => event.name);

describe("getPublicEventBySlug", () => {
  it("returns the segments in order, with the main event first", async () => {
    const event = await getPublicEventBySlug(db, "showbox-fight-night-5");
    expect(event).not.toBeNull();
    expect(event!.segments.map((segment) => segment.name)).toEqual(["Cartelera estelar", "Preliminares"]);

    const main = event!.segments[0]!.bouts[0]!;
    expect(main.red.lastName).toBe("Cevallos");
    expect(main.blue.lastName).toBe("Quiñónez");
    expect(main.isTitleFight).toBe(true);
    expect(main.scheduledRounds).toBe(12);
    expect(main.roundSeconds).toBe(180);
    expect(main.division?.name).toBe("Superligero");
    expect(main.result).toBeNull();
  });

  it("gives each fighter the body measures the card compares, null when the fighter has none", async () => {
    const main = (await getPublicEventBySlug(db, "showbox-fight-night-5"))!.segments[0]!.bouts[0]!;
    expect(main.red).toMatchObject({ heightCm: 175, reachCm: 180, weightKg: 63.5 });
    expect(main.blue).toMatchObject({ heightCm: 177, reachCm: 183 });
    const prelim = (await getPublicEventBySlug(db, "showbox-fight-night-5"))!.segments[1]!.bouts.flatMap((bout) => [bout.red, bout.blue]);
    expect(prelim.some((fighter) => fighter.reachCm === null)).toBe(true);
  });

  it("carries the event data as plain values that survive JSON caching", async () => {
    const event = (await getPublicEventBySlug(db, "showbox-fight-night-5"))!;
    expect(event.name).toBe("ShowBox Fight Night 5");
    expect(event.number).toBe(5);
    expect(event.eventStatus).toBe("scheduled");
    expect(event.venue).toMatchObject({ name: "Quorum Paseo San Francisco", city: "Quito" });
    expect(typeof event.startsAt).toBe("string");
    expect(new Date(event.startsAt).toISOString()).toBe(event.startsAt);
    expect(event.ticketTiers.map((tier) => tier.priceClp)).toEqual([25, 45, 90]);
    expect(JSON.parse(JSON.stringify(event))).toEqual(event);
  });

  it("shows a catch weight instead of a division when the fight has one", async () => {
    const event = (await getPublicEventBySlug(db, "showbox-fight-night-5"))!;
    const catchweight = event.segments[1]!.bouts.find((bout) => bout.catchweightKg !== null);
    expect(catchweight).toMatchObject({ catchweightKg: 65, division: null });
  });

  it("marks fighters that are not public so the page does not link them", async () => {
    // Un boxeador en borrador puede pelear: sale en la cartelera, pero sin enlace a su ficha. (En el evento en borrador,
    // leído como vista previa, para no sumar un evento a los listados que prueban los otros tests.)
    const ligero = await divisionIdBySlug(db, "peso-superligero");
    const newcomer = await createFighter(db, validFighterInput(ligero, { firstName: "Nuevo", lastName: "Debutante" }), "admin-1");
    const draftId = await eventIdBySlug(db, "evento-borrador");
    await insertBout(db, { eventId: draftId, segmentId: await insertSegment(db, draftId, "Preliminares", 1), redFighterId: await fighterIdBySlug(db, "jordan-quinonez"), blueFighterId: newcomer.id });

    const bouts = (await getPublicEventBySlug(db, "evento-borrador", { preview: true }))!.segments.flatMap((segment) => segment.bouts);
    const debut = bouts.find((bout) => bout.blue.lastName === "Debutante")!;
    expect(debut.red.isPublic).toBe(true);
    expect(debut.blue.isPublic).toBe(false);
  });

  it("writes the result line of a finished fight with the surnames", async () => {
    const event = (await getPublicEventBySlug(db, "showbox-fight-night-4"))!;
    const main = event.segments[0]!.bouts[0]!;
    expect(main.status).toBe("completed");
    expect(main.result).toMatchObject({ outcome: "red_win", method: "ko_tko", endRound: 7, endTimeSeconds: 123 });
    expect(main.result!.line).toBe("Quiñónez vence a Andrango · KO · R7 2:03");
  });

  it("names the kind of stoppage in the result line", async () => {
    const event = (await getPublicEventBySlug(db, "showbox-fight-night-3"))!;
    const stoppage = event.segments[0]!.bouts[0]!;
    expect(stoppage.result!.line).toBe("Andrango vence a Chalá · TKO (detención médica) · R6 1:42");
    expect(stoppage).toMatchObject({ catchweightKg: 60, division: null });
    expect(stoppage.result!.methodText).toBe("TKO (detención médica)");
  });

  it("gives body photos only for the main event", async () => {
    const event = (await getPublicEventBySlug(db, "showbox-fight-night-5"))!;
    expect(event.segments[0]!.bouts[1]!.red.bodyMedia).toBeNull();
  });

  it("hides drafts, trashed and future-scheduled events; preview shows drafts but never the trash", async () => {
    expect(await getPublicEventBySlug(db, "evento-borrador")).toBeNull();
    expect(await getPublicEventBySlug(db, "evento-borrador", { preview: true })).not.toBeNull();
    expect(await getPublicEventBySlug(db, "evento-papelera")).toBeNull();
    expect(await getPublicEventBySlug(db, "evento-papelera", { preview: true })).toBeNull();
    expect(await getPublicEventBySlug(db, "evento-programado")).toBeNull();
    expect(await getPublicEventBySlug(db, "no-existe")).toBeNull();
  });
});

describe("getPublicEventRef", () => {
  it("answers only for events that are public right now", async () => {
    expect(await getPublicEventRef(db, "showbox-fight-night-5")).toMatchObject({ id: expect.any(String), eventStatus: "scheduled" });
    expect(await getPublicEventRef(db, "evento-en-vivo")).toMatchObject({ eventStatus: "live" });
    expect(await getPublicEventRef(db, "evento-borrador")).toBeNull();
    expect(await getPublicEventRef(db, "evento-papelera")).toBeNull();
    expect(await getPublicEventRef(db, "evento-programado")).toBeNull();
  });
});

describe("listPublicEvents", () => {
  it("lists upcoming events by date ascending, including one that is live now", async () => {
    const { items } = await listPublicEvents(db, { when: "upcoming" });
    expect(names(items)).toEqual(["Evento en vivo", "Evento cercano", "ShowBox Fight Night 5", "Evento lejano"]);
  });

  it("lists past events by date descending, with the forgotten and the finished ones", async () => {
    const { items } = await listPublicEvents(db, { when: "past" });
    expect(names(items)).toEqual([
      "Evento recién terminado",
      "Evento olvidado",
      "ShowBox Fight Night 4",
      "ShowBox Fight Night 3",
      "ShowBox Fight Night 2",
      "ShowBox Fight Night 1",
    ]);
  });

  it("never lists drafts, trashed or not-yet-published events", async () => {
    const all = [...(await listPublicEvents(db, { when: "upcoming" })).items, ...(await listPublicEvents(db, { when: "past" })).items];
    expect(names(all)).not.toContain("Evento borrador");
    expect(names(all)).not.toContain("Evento en la papelera");
    expect(names(all)).not.toContain("Evento programado");
  });

  it("paginates and says whether there is another page", async () => {
    const first = await listPublicEvents(db, { when: "past" }, { page: 1, pageSize: 4 });
    const second = await listPublicEvents(db, { when: "past" }, { page: 2, pageSize: 4 });
    expect(first.items).toHaveLength(4);
    expect(first.hasMore).toBe(true);
    expect(names(second.items)).toEqual(["ShowBox Fight Night 2", "ShowBox Fight Night 1"]);
    expect(second.hasMore).toBe(false);
  });

  it("gives each card the main event, the tickets and the date as text", async () => {
    const { items } = await listPublicEvents(db, { when: "upcoming" });
    const card = items.find((event) => event.slug === "showbox-fight-night-5")!;
    expect(card.mainBout?.red.lastName).toBe("Cevallos");
    expect(card.mainBout?.blue.lastName).toBe("Quiñónez");
    expect(card.ticketTiers).toHaveLength(3);
    expect(card.ticketUrl).toMatch(/^https:/);
    expect(new Date(card.startsAt).toISOString()).toBe(card.startsAt);
    expect(items.find((event) => event.slug === "evento-cercano")!.mainBout).toBeNull();
  });
});

describe("getNextEvent", () => {
  it("returns the closest upcoming public event", async () => {
    expect((await getNextEvent(db))?.name).toBe("Evento en vivo");
  });
});

describe("the main event of a card whose headliner was cancelled", () => {
  it("is the next bout of the card, in the events list", async () => {
    const event = await insertEvent(db, { name: "Evento sin estelar", slug: "evento-sin-estelar", startsAt: daysFromNow(6) });
    const [cevallos, quinonez, munoz, ibarra] = await Promise.all(["bryan-cevallos", "jordan-quinonez", "ruth-huaman", "patricio-ortiz"].map((slug) => fighterIdBySlug(db, slug)));
    const estelar = await insertSegment(db, event.id, "Cartelera estelar", 0);
    const prelim = await insertSegment(db, event.id, "Preliminares", 1);
    await insertBout(db, { eventId: event.id, segmentId: estelar, redFighterId: cevallos!, blueFighterId: quinonez!, sortOrder: 0, boutStatus: "cancelled" });
    await insertBout(db, { eventId: event.id, segmentId: estelar, redFighterId: munoz!, blueFighterId: ibarra!, sortOrder: 1 });
    await insertBout(db, { eventId: event.id, segmentId: prelim, redFighterId: cevallos!, blueFighterId: ibarra!, sortOrder: 0 });

    const card = (await listPublicEvents(db, { when: "upcoming" })).items.find((item) => item.slug === "evento-sin-estelar")!;
    expect(card.mainBout?.red.lastName).toBe("Huamán");
  });

  it("is the first bout of the first block that has bouts when the top block is empty", async () => {
    const event = await insertEvent(db, { name: "Evento estelar vacío", slug: "evento-estelar-vacio", startsAt: daysFromNow(7) });
    const [cevallos, quinonez] = await Promise.all(["bryan-cevallos", "jordan-quinonez"].map((slug) => fighterIdBySlug(db, slug)));
    await insertSegment(db, event.id, "Cartelera estelar", 0);
    await insertBout(db, { eventId: event.id, segmentId: await insertSegment(db, event.id, "Preliminares", 1), redFighterId: cevallos!, blueFighterId: quinonez! });

    const card = (await listPublicEvents(db, { when: "upcoming" })).items.find((item) => item.slug === "evento-estelar-vacio")!;
    expect(card.mainBout?.red.lastName).toBe("Cevallos");
  });
});
