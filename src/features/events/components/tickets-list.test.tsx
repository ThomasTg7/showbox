// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { EventCardDTO } from "../dto";
import { TicketsList } from "./tickets-list";

afterEach(cleanup);

const event: EventCardDTO = {
  id: "e1",
  slug: "showbox-fight-night-5",
  name: "ShowBox Fight Night 5",
  number: 5,
  startsAt: "2026-10-25T00:00:00.000Z",
  endsEstimatedAt: null,
  venueName: "Arena Santiago",
  venueCity: "Santiago",
  eventStatus: "scheduled",
  ticketUrl: "https://tickets.example.cl/gc5",
  ticketTiers: [
    { name: "General", description: "Galería", priceClp: 15000, soldOut: false },
    { name: "Ringside", description: "Primera fila", priceClp: 45000, soldOut: true },
  ],
  ticketPoints: "Boletería del recinto\nTienda oficial",
  heroMedia: null,
  heroMobileMedia: null,
  posterMedia: null,
  mainBout: null,
};

describe("TicketsList", () => {
  it("says the next event will be announced when there is none", () => {
    render(<TicketsList events={[]} />);
    expect(screen.getByText("Pronto anunciaremos el próximo evento")).toBeDefined();
  });

  it("shows the tiers, the ticket office button and the points of sale of each event", () => {
    render(<TicketsList events={[event]} />);
    expect(screen.getByRole("heading", { name: "ShowBox Fight Night 5", level: 2 })).toBeDefined();
    expect(screen.getByText("$15.000")).toBeDefined();
    expect(screen.getByText("AGOTADO")).toBeDefined();
    const button = screen.getByRole("link", { name: /Ir a la ticketera/ });
    expect(button.getAttribute("href")).toBe("https://tickets.example.cl/gc5");
    expect(button.getAttribute("rel")).toContain("noopener");
    expect(screen.getByText("Puntos de venta")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver el evento" }).getAttribute("href")).toBe("/eventos/showbox-fight-night-5");
  });

  it("does not sell tickets for a cancelled event", () => {
    render(<TicketsList events={[{ ...event, eventStatus: "cancelled" }]} />);
    expect(screen.getByText("Este evento fue cancelado.")).toBeDefined();
    expect(screen.queryByRole("link", { name: /Ir a la ticketera/ })).toBeNull();
    expect(screen.queryByText("$15.000")).toBeNull();
  });

  it("says the tickets are coming when the event has no tiers, link or points yet", () => {
    render(<TicketsList events={[{ ...event, ticketUrl: null, ticketTiers: [], ticketPoints: null }]} />);
    expect(screen.getByText("Pronto publicaremos las entradas de este evento.")).toBeDefined();
  });
});
