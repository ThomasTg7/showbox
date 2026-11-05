// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { TicketTier } from "@/db/schema/events";
import { TicketTiers } from "./ticket-tiers";

afterEach(cleanup);

const tiers: TicketTier[] = [
  { name: "General", description: "Galería · Acceso 19:30", priceClp: 15000, soldOut: false },
  { name: "Preferencial", description: "Platea numerada", priceClp: 25000, soldOut: false },
  { name: "Ringside", description: "Primera fila · Meet & greet", priceClp: 45000, soldOut: true },
];

describe("TicketTiers", () => {
  it("lists every tier with its price in pesos", () => {
    render(<TicketTiers tiers={tiers} ticketUrl="https://tickets.example.cl/gc5" eventName="ShowBox Fight Night 5" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("$15.000")).toBeDefined();
    expect(screen.getByText("$25.000")).toBeDefined();
    expect(screen.getByText("Galería · Acceso 19:30")).toBeDefined();
  });

  it("marks a sold-out tier AGOTADO and gives it no link", () => {
    render(<TicketTiers tiers={tiers} ticketUrl="https://tickets.example.cl/gc5" eventName="ShowBox Fight Night 5" />);
    const soldOut = screen.getByText("Ringside").closest("li")!;
    expect(soldOut.textContent).toContain("AGOTADO");
    expect(soldOut.querySelector("a")).toBeNull();
  });

  it("links the tiers on sale to the ticket office in a new tab, safely", () => {
    render(<TicketTiers tiers={tiers} ticketUrl="https://tickets.example.cl/gc5" eventName="ShowBox Fight Night 5" />);
    const link = screen.getByRole("link", { name: /General/ });
    expect(link.getAttribute("href")).toBe("https://tickets.example.cl/gc5");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("shows the tiers without links when the event has no ticket office yet", () => {
    render(<TicketTiers tiers={tiers} ticketUrl={null} eventName="ShowBox Fight Night 5" />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("General")).toBeDefined();
  });

  it("renders nothing without tiers", () => {
    const { container } = render(<TicketTiers tiers={[]} ticketUrl={null} eventName="ShowBox Fight Night 5" />);
    expect(container.textContent).toBe("");
  });
});
