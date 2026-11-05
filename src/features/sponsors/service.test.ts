import { and, asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { sponsorEvents, sponsors } from "@/db/schema/sponsors";
import { insertEvent } from "@/features/events/test-helpers";
import { insertMedia } from "@/features/fighters/test-helpers";
import { UserFacingError } from "@/lib/user-facing-error";
import { createTestDb } from "@/test/db";
import { createSponsor, reorderSponsors, updateSponsor } from "./service";
import { insertSponsor, validSponsorInput } from "./test-helpers";

describe("sponsors service", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  const logo = () => insertMedia(db, "sponsor_logo");
  const rejects = async (promise: Promise<unknown>, message: RegExp) => {
    const error = await promise.then(() => null, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(UserFacingError);
    expect((error as Error).message).toMatch(message);
  };

  describe("createSponsor", () => {
    it("saves the sponsor at the end of its tier and audits it", async () => {
      const first = await createSponsor(db, validSponsorInput(await logo(), { name: "Uno" }), "admin-1");
      const second = await createSponsor(db, validSponsorInput(await logo(), { name: "Dos" }), "admin-1");
      const other = await createSponsor(db, validSponsorInput(await logo(), { name: "Otro nivel", tier: "principal" }), "admin-1");

      const rows = await db.select().from(sponsors);
      const order = Object.fromEntries(rows.map((row) => [row.id, row.sortOrder]));
      expect([order[first.id], order[second.id], order[other.id]]).toEqual([0, 1, 0]);
      expect(rows.find((row) => row.id === first.id)).toMatchObject({ name: "Uno", allEvents: true, active: true, tier: "oficial" });
      const [entry] = await db.select().from(auditLog).where(eq(auditLog.entityId, first.id));
      expect(entry).toMatchObject({ actorId: "admin-1", action: "create", entityType: "sponsor" });
    });

    it("trims the name, keeps a valid link and stores empty optional fields as null", async () => {
      const { id } = await createSponsor(db, validSponsorInput(await logo(), { name: "  Titán  ", url: " https://titan.example.cl ", startsOn: "", endsOn: "" }), "admin-1");

      const [row] = await db.select().from(sponsors).where(eq(sponsors.id, id));
      expect(row).toMatchObject({ name: "Titán", url: "https://titan.example.cl", startsOn: null, endsOn: null });
    });

    it("rejects an empty name, a link that is not http(s) and a missing logo", async () => {
      await rejects(createSponsor(db, validSponsorInput(await logo(), { name: "  " }), "admin-1"), /nombre/i);
      await rejects(createSponsor(db, validSponsorInput(await logo(), { url: "javascript:alert(1)" }), "admin-1"), /enlace/i);
      await rejects(createSponsor(db, validSponsorInput("", {}), "admin-1"), /logo/i);
    });

    it("rejects a logo that is missing or is not a sponsor logo", async () => {
      await rejects(createSponsor(db, validSponsorInput(await insertMedia(db, "gallery")), "admin-1"), /ya no está disponible/);
      await rejects(createSponsor(db, validSponsorInput("0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11"), "admin-1"), /ya no está disponible/);
      expect(await db.select().from(sponsors)).toEqual([]);
    });

    it("rejects a validity that ends before it starts", async () => {
      await rejects(createSponsor(db, validSponsorInput(await logo(), { startsOn: "2026-11-01", endsOn: "2026-10-01" }), "admin-1"), /antes del inicio/i);
    });

    it("rejects a day that does not exist", async () => {
      await rejects(createSponsor(db, validSponsorInput(await logo(), { endsOn: "2026-02-31" }), "admin-1"), /fecha/i);
      await rejects(createSponsor(db, validSponsorInput(await logo(), { startsOn: "2026-13-01" }), "admin-1"), /fecha/i);
    });

    it("ties the sponsor to its events when it is not for every event", async () => {
      const event = await insertEvent(db);
      const { id } = await createSponsor(db, validSponsorInput(await logo(), { allEvents: false, eventIds: [event.id] }), "admin-1");

      expect(await db.select().from(sponsorEvents).where(eq(sponsorEvents.sponsorId, id))).toEqual([{ sponsorId: id, eventId: event.id }]);
    });

    it("asks for at least one event when it is not for every event, and refuses an event that does not exist or is in the trash", async () => {
      await rejects(createSponsor(db, validSponsorInput(await logo(), { allEvents: false, eventIds: [] }), "admin-1"), /al menos un evento/i);
      await rejects(createSponsor(db, validSponsorInput(await logo(), { allEvents: false, eventIds: ["0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11"] }), "admin-1"), /evento/i);
      const trashed = await insertEvent(db, { deletedAt: new Date() });
      await rejects(createSponsor(db, validSponsorInput(await logo(), { allEvents: false, eventIds: [trashed.id] }), "admin-1"), /evento/i);
    });

    it("ignores the events of a sponsor that is for every event", async () => {
      const event = await insertEvent(db);
      const { id } = await createSponsor(db, validSponsorInput(await logo(), { allEvents: true, eventIds: [event.id] }), "admin-1");

      expect(await db.select().from(sponsorEvents).where(eq(sponsorEvents.sponsorId, id))).toEqual([]);
    });
  });

  describe("updateSponsor", () => {
    it("changes the data, replaces the events and audits the change", async () => {
      const [one, two] = [await insertEvent(db), await insertEvent(db)];
      const { id } = await createSponsor(db, validSponsorInput(await logo(), { allEvents: false, eventIds: [one.id] }), "admin-1");

      await updateSponsor(db, id, validSponsorInput(await logo(), { name: "Nuevo nombre", allEvents: false, eventIds: [two.id], active: false }), "admin-2");

      const [row] = await db.select().from(sponsors).where(eq(sponsors.id, id));
      expect(row).toMatchObject({ name: "Nuevo nombre", active: false });
      expect((await db.select().from(sponsorEvents).where(eq(sponsorEvents.sponsorId, id))).map((link) => link.eventId)).toEqual([two.id]);
      const entries = await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "update")));
      expect(entries).toHaveLength(1);
      expect(entries[0]?.actorId).toBe("admin-2");
    });

    it("clears the events when the sponsor becomes one of every event", async () => {
      const event = await insertEvent(db);
      const { id } = await createSponsor(db, validSponsorInput(await logo(), { allEvents: false, eventIds: [event.id] }), "admin-1");

      await updateSponsor(db, id, validSponsorInput(await logo(), { allEvents: true }), "admin-1");

      expect(await db.select().from(sponsorEvents).where(eq(sponsorEvents.sponsorId, id))).toEqual([]);
    });

    it("moves a sponsor that changes tier to the end of the new one", async () => {
      await createSponsor(db, validSponsorInput(await logo(), { name: "Principal 1", tier: "principal" }), "admin-1");
      const { id } = await createSponsor(db, validSponsorInput(await logo(), { name: "Oficial" }), "admin-1");

      await updateSponsor(db, id, validSponsorInput(await logo(), { name: "Oficial", tier: "principal" }), "admin-1");

      const [row] = await db.select().from(sponsors).where(eq(sponsors.id, id));
      expect(row).toMatchObject({ tier: "principal", sortOrder: 1 });
    });

    it("keeps the position when the tier does not change", async () => {
      await createSponsor(db, validSponsorInput(await logo(), { name: "Uno" }), "admin-1");
      const { id } = await createSponsor(db, validSponsorInput(await logo(), { name: "Dos" }), "admin-1");

      await updateSponsor(db, id, validSponsorInput(await logo(), { name: "Dos editado" }), "admin-1");

      expect((await db.select().from(sponsors).where(eq(sponsors.id, id)))[0]?.sortOrder).toBe(1);
    });

    it("rejects a sponsor that does not exist or is in the trash", async () => {
      await rejects(updateSponsor(db, "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11", validSponsorInput(await logo()), "admin-1"), /No se encontró/);
      const trashed = await insertSponsor(db, { deletedAt: new Date() });
      await rejects(updateSponsor(db, trashed.id, validSponsorInput(await logo()), "admin-1"), /No se encontró/);
    });
  });

  describe("reorderSponsors", () => {
    it("writes the new order of a tier as 0..n-1", async () => {
      const [a, b, c] = [await insertSponsor(db, { sortOrder: 0 }), await insertSponsor(db, { sortOrder: 1 }), await insertSponsor(db, { sortOrder: 2 })];
      const bystander = await insertSponsor(db, { tier: "principal", sortOrder: 5 });

      await reorderSponsors(db, "oficial", [c.id, a.id, b.id], "admin-1");

      const rows = await db.select().from(sponsors).orderBy(asc(sponsors.sortOrder));
      expect(rows.filter((row) => row.tier === "oficial").map((row) => row.id)).toEqual([c.id, a.id, b.id]);
      expect(rows.filter((row) => row.tier === "oficial").map((row) => row.sortOrder)).toEqual([0, 1, 2]);
      expect(rows.find((row) => row.id === bystander.id)?.sortOrder).toBe(5);
    });

    it("rejects a list that is not exactly the sponsors of that tier (someone else changed it)", async () => {
      const a = await insertSponsor(db, { sortOrder: 0 });
      await insertSponsor(db, { sortOrder: 1 });

      await rejects(reorderSponsors(db, "oficial", [a.id], "admin-1"), /cambió/i);
    });

    it("rejects a list that repeats a sponsor, even with the right length", async () => {
      const a = await insertSponsor(db, { sortOrder: 0 });
      await insertSponsor(db, { sortOrder: 1 });

      await rejects(reorderSponsors(db, "oficial", [a.id, a.id], "admin-1"), /cambió/i);
    });

    it("ignores the sponsors in the trash: the visible ones can still be ordered", async () => {
      const [a, b] = [await insertSponsor(db, { sortOrder: 0 }), await insertSponsor(db, { sortOrder: 1 })];
      await insertSponsor(db, { sortOrder: 2, deletedAt: new Date() });

      await reorderSponsors(db, "oficial", [b.id, a.id], "admin-1");

      const rows = await db.select({ id: sponsors.id }).from(sponsors).where(eq(sponsors.tier, "oficial")).orderBy(asc(sponsors.sortOrder));
      expect(rows.slice(0, 2).map((row) => row.id)).toEqual([b.id, a.id]);
    });
  });
});
