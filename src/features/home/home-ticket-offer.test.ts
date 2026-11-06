import { expect, it } from "vitest";
import { getHomeTicketOffer } from "./home-ticket-offer";

const now = Date.parse("2026-11-06T12:00:00Z");
const event = { name: "ShowBox 5", startsAt: "2026-11-28T02:00:00Z", eventStatus: "scheduled" as const, ticketUrl: "https://tickets.example.com/5", ticketTiers: [], venue: { name: "Quorum", city: "Quito", address: "Av. 1", lat: null, lng: null } };

it("uses the current upcoming event and its assigned ticket link", () => {
  expect(getHomeTicketOffer({ kind: "next-event", event }, now)).toMatchObject({ name: "ShowBox 5", ticketHref: event.ticketUrl, external: true });
});
it("supports assigned ticket tiers without an external ticket seller", () => {
  expect(getHomeTicketOffer({ kind: "next-event", event: { ...event, ticketUrl: null, ticketTiers: [{ name: "General", description: "", priceClp: 25, soldOut: false }] } }, now)).toMatchObject({ ticketHref: "/entradas", external: false });
});
it("does not advertise an upcoming event without assigned tickets", () => {
  expect(getHomeTicketOffer({ kind: "next-event", event: { ...event, ticketUrl: null } }, now)).toBeNull();
});
it("does not advertise a past event or an empty home", () => {
  expect(getHomeTicketOffer({ kind: "last-event", event }, now)).toBeNull();
  expect(getHomeTicketOffer({ kind: "brand" }, now)).toBeNull();
});
it("rejects cancelled and stale scheduled events", () => {
  expect(getHomeTicketOffer({ kind: "next-event", event: { ...event, eventStatus: "cancelled" } }, now)).toBeNull();
  expect(getHomeTicketOffer({ kind: "next-event", event: { ...event, startsAt: "2026-10-01T00:00:00Z" } }, now)).toBeNull();
});
