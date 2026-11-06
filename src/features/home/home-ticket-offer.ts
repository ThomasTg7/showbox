import type { EventPageDTO } from "@/features/events/dto";
import { sellsTickets } from "@/features/events/public-format";
import { formatShortDate, formatTime } from "@/lib/format-date";

type TicketEvent = Pick<EventPageDTO, "name" | "startsAt" | "eventStatus" | "ticketUrl" | "ticketTiers"> & { venue: Pick<EventPageDTO["venue"], "name"> };
type TicketHero = { kind: "brand" } | { kind: "next-event" | "last-event"; event: TicketEvent };

/** Never advertise a past event or unassigned tickets. */
export function getHomeTicketOffer(hero: TicketHero, nowMs = Date.now()) {
  if (hero.kind !== "next-event") return null;
  const { event } = hero;
  if (!sellsTickets(event, nowMs) || (!event.ticketUrl && !event.ticketTiers.length)) return null;
  const start = new Date(event.startsAt);
  return {
    name: event.name,
    meta: `${formatShortDate(start)} · ${formatTime(start)} hrs · ${event.venue.name}`,
    ticketHref: event.ticketUrl || "/entradas",
    external: Boolean(event.ticketUrl),
  };
}
