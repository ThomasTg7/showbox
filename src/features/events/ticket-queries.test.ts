import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { events } from "@/db/schema/events";
import { createTestDb } from "@/test/db";
import { daysFromNow, insertEvent } from "./test-helpers";
import { getLatestTicketEvent } from "./ticket-queries";

it("selects the latest ticketed upcoming public event and excludes unassigned, draft, past and cancelled events", async () => {
  const testDb = await createTestDb();
  try {
    const { db } = testDb;
    const first = await insertEvent(db, { startsAt: daysFromNow(30), ticketUrl: "https://tickets.example.com/first" });
    const latest = await insertEvent(db, { startsAt: daysFromNow(50), ticketTiers: [{ name: "General", description: "", priceClp: 25, soldOut: false }] });
    await insertEvent(db, { startsAt: daysFromNow(60) });
    await insertEvent(db, { startsAt: daysFromNow(70), ticketUrl: "https://tickets.example.com/draft", status: "draft" });
    await insertEvent(db, { startsAt: daysFromNow(-30), ticketUrl: "https://tickets.example.com/past" });
    expect(await getLatestTicketEvent(db)).toMatchObject({ id: latest.id });
    await db.update(events).set({ ticketTiers: [] }).where(eq(events.id, latest.id));
    expect(await getLatestTicketEvent(db)).toMatchObject({ id: first.id });
    await db.update(events).set({ eventStatus: "cancelled" }).where(eq(events.id, first.id));
    expect(await getLatestTicketEvent(db)).toBeNull();
  } finally { await testDb.close(); }
});
