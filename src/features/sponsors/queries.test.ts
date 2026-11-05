import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { insertEvent } from "@/features/events/test-helpers";
import { createTestDb } from "@/test/db";
import type { SponsorPlacement } from "@/domain/sponsors";
import { listAdminSponsors, listSponsorsFor, type ListSponsorsOptions } from "./queries";
import { insertSponsor } from "./test-helpers";

// 24 de octubre de 2026, 12:00 en Chile (UTC-3).
const NOON_IN_ECUADOR = new Date("2026-10-24T17:00:00Z");

describe("sponsors queries", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  const names = async (placement: SponsorPlacement, options: ListSponsorsOptions = {}) =>
    (await listSponsorsFor(db, placement, options)).map((sponsor) => sponsor.name);

  describe("listSponsorsFor", () => {
    it("orders by tier and then by the order inside the tier", async () => {
      await insertSponsor(db, { name: "Colaborador A", tier: "colaborador", sortOrder: 0 });
      await insertSponsor(db, { name: "Oficial B", tier: "oficial", sortOrder: 1 });
      await insertSponsor(db, { name: "Oficial A", tier: "oficial", sortOrder: 0 });
      await insertSponsor(db, { name: "Principal", tier: "principal", sortOrder: 0 });

      expect(await names("event", { now: NOON_IN_ECUADOR })).toEqual(["Principal", "Oficial A", "Oficial B", "Colaborador A"]);
    });

    it("shows principal and oficial on the home, and only principal in the footer", async () => {
      await insertSponsor(db, { name: "Principal", tier: "principal" });
      await insertSponsor(db, { name: "Oficial", tier: "oficial" });
      await insertSponsor(db, { name: "Colaborador", tier: "colaborador" });

      expect(await names("home", { now: NOON_IN_ECUADOR })).toEqual(["Principal", "Oficial"]);
      expect(await names("footer", { now: NOON_IN_ECUADOR })).toEqual(["Principal"]);
    });

    it("on an event shows the sponsors of every event and the ones tied to it, not those tied to another event", async () => {
      const mine = await insertEvent(db);
      const other = await insertEvent(db);
      await insertSponsor(db, { name: "De todos", tier: "principal", sortOrder: 0 });
      await insertSponsor(db, { name: "De este evento", tier: "principal", sortOrder: 1, eventIds: [mine.id] });
      await insertSponsor(db, { name: "De ambos", tier: "oficial", sortOrder: 0, eventIds: [mine.id, other.id] });
      await insertSponsor(db, { name: "De otro evento", tier: "oficial", sortOrder: 1, eventIds: [other.id] });

      expect(await names("event", { eventId: mine.id, now: NOON_IN_ECUADOR })).toEqual(["De todos", "De este evento", "De ambos"]);
    });

    it("the home and the footer only show the sponsors of every event", async () => {
      const event = await insertEvent(db);
      await insertSponsor(db, { name: "De todos", tier: "principal" });
      await insertSponsor(db, { name: "De un evento", tier: "principal", eventIds: [event.id] });

      expect(await names("home", { now: NOON_IN_ECUADOR })).toEqual(["De todos"]);
      expect(await names("footer", { now: NOON_IN_ECUADOR })).toEqual(["De todos"]);
    });

    it("an event placement without an event only shows the sponsors of every event", async () => {
      const event = await insertEvent(db);
      await insertSponsor(db, { name: "De todos" });
      await insertSponsor(db, { name: "De un evento", eventIds: [event.id] });

      expect(await names("event", { now: NOON_IN_ECUADOR })).toEqual(["De todos"]);
    });

    it("hides what is inactive, in the trash, not started yet or already over", async () => {
      await insertSponsor(db, { name: "Vigente", startsOn: "2026-10-01", endsOn: "2026-12-31" });
      await insertSponsor(db, { name: "Inactivo", active: false });
      await insertSponsor(db, { name: "En la papelera", deletedAt: new Date() });
      await insertSponsor(db, { name: "Aún no empieza", startsOn: "2026-10-25" });
      await insertSponsor(db, { name: "Ya terminó", endsOn: "2026-10-23" });

      expect(await names("home", { now: NOON_IN_ECUADOR })).toEqual(["Vigente"]);
    });

    it("a sponsor that ends today stays visible until the end of the day in Ecuador, not until 19:00 UTC", async () => {
      await insertSponsor(db, { name: "Vence hoy", endsOn: "2026-10-24" });

      // 23:30 en Ecuador del 24: en UTC ya es el 25.
      expect(await names("home", { now: new Date("2026-10-25T04:30:00Z") })).toEqual(["Vence hoy"]);
      // 00:30 en Ecuador del 25.
      expect(await names("home", { now: new Date("2026-10-25T05:30:00Z") })).toEqual([]);
    });

    it("returns the logo of each sponsor from a single read", async () => {
      await insertSponsor(db, { name: "Con logo", url: "https://titan.example.cl" });

      const [sponsor] = await listSponsorsFor(db, "home", { now: NOON_IN_ECUADOR });

      expect(sponsor).toMatchObject({ name: "Con logo", url: "https://titan.example.cl", tier: "oficial" });
      expect(sponsor?.logo.kind).toBe("sponsor_logo");
      expect(sponsor?.logo.originalUrl).toContain("originals/sponsor_logo");
    });

    it("every call is JSON-safe (it goes through unstable_cache)", async () => {
      await insertSponsor(db);
      const result = await listSponsorsFor(db, "home", { now: NOON_IN_ECUADOR });

      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    });
  });

  describe("listAdminSponsors", () => {
    it("lists everything but the trash, by tier and order, with its validity and events", async () => {
      const event = await insertEvent(db, { name: "ShowBox Fight Night 5" });
      await insertSponsor(db, { name: "Vencido", tier: "oficial", sortOrder: 1, endsOn: "2026-01-01" });
      await insertSponsor(db, { name: "Vigente", tier: "oficial", sortOrder: 0, eventIds: [event.id] });
      await insertSponsor(db, { name: "Principal", tier: "principal" });
      await insertSponsor(db, { name: "Borrado", deletedAt: new Date() });

      const { items, hasMore } = await listAdminSponsors(db, { now: NOON_IN_ECUADOR });

      expect(hasMore).toBe(false);
      expect(items.map((item) => [item.name, item.validity])).toEqual([
        ["Principal", "current"],
        ["Vigente", "current"],
        ["Vencido", "expired"],
      ]);
      expect(items[1]?.events).toEqual([{ id: event.id, name: "ShowBox Fight Night 5" }]);
      expect(items[0]?.events).toEqual([]);
    });

    it("paginates at most 50 per page and tells when there are more", async () => {
      for (let index = 0; index < 3; index += 1) await insertSponsor(db, { name: `Patrocinador ${index}`, sortOrder: index });

      const first = await listAdminSponsors(db, { now: NOON_IN_ECUADOR }, { pageSize: 2 });
      const second = await listAdminSponsors(db, { now: NOON_IN_ECUADOR }, { page: 2, pageSize: 2 });

      expect(first.items).toHaveLength(2);
      expect(first.hasMore).toBe(true);
      expect(second.items).toHaveLength(1);
      expect(second.hasMore).toBe(false);
    });
  });
});
