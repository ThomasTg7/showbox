import { and, desc, isNotNull, ne, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { publicScope } from "@/db/public-scope";
import { events } from "@/db/schema/events";
import { eventsWithPendingBouts } from "./event-scope";

/** The latest public upcoming event with assigned tickets, without loading cards or media. */
export async function getLatestTicketEvent(db: Db) {
  const [event] = await db.select({
    id: events.id, name: events.name, startsAt: events.startsAt, eventStatus: events.eventStatus,
    ticketUrl: events.ticketUrl, ticketTiers: events.ticketTiers, venueName: events.venueName,
  }).from(events).where(and(
    publicScope(events), eventsWithPendingBouts(),
    or(and(isNotNull(events.ticketUrl), ne(events.ticketUrl, "")), sql`jsonb_array_length(${events.ticketTiers}) > 0`),
  )).orderBy(desc(events.startsAt), desc(events.id)).limit(1);
  return event ? { ...event, startsAt: event.startsAt.toISOString(), venue: { name: event.venueName } } : null;
}
