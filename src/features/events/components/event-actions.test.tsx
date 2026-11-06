// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { stubBrowserApis } from "@/test/browser-stubs";
import { EventActions } from "./event-actions";

beforeAll(stubBrowserApis);
afterEach(cleanup);

describe("EventActions", () => {
  it("places the broadcast control first and the full card link last on a cover", () => {
    const { container } = render(<EventActions layout="hero" eventName="ShowBox 5" detailsHref="#cartelera" detailsLabel="Ver cartelera completa" ticketHref="https://tickets.example.com/5" />);
    const controls = [...container.querySelector('[data-slot="event-actions"]')!.children];
    expect(controls[0]).toBe(screen.getByRole("button", { name: "Dónde ver" }));
    expect(controls[1]).toBe(screen.getByRole("link", { name: "Comprar entradas" }));
    expect(controls[2]).toBe(screen.getByRole("link", { name: "Ver cartelera completa" }));
    expect(controls[2]).toHaveClass("col-span-2");
    expect(controls[0]).not.toHaveClass("col-span-2");
  });
  it("keeps event navigation, external tickets and broadcast options as independent controls", () => {
    render(<EventActions eventName="ShowBox 5" detailsHref="/eventos/showbox-5" ticketHref="https://tickets.example.com/5" ticketExternal platforms={[{ name: "YouTube ShowBox", url: "https://www.youtube.com/@ShowBoxPromotionsEC", media: null }]} />);
    expect(screen.getByRole("link", { name: "Ver evento" })).toHaveAttribute("href", "/eventos/showbox-5");
    expect(screen.getByRole("link", { name: "Comprar entradas" })).toHaveAttribute("target", "_blank");
    fireEvent.click(screen.getByRole("button", { name: "Dónde ver" }));
    expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("link", { name: "Ir a ver en YouTube ShowBox" }));
    expect(screen.getByRole("link", { name: "Ir a ver en YouTube ShowBox" })).toHaveAttribute("href", "https://www.youtube.com/@ShowBoxPromotionsEC");
    expect(screen.getByTestId("youtube-platform-icon")).toBeVisible();
  });

  it("does not invent a ticket destination for a past event", () => {
    render(<EventActions eventName="ShowBox 4" detailsHref="/eventos/showbox-4" platforms={[]} />);
    expect(screen.queryByRole("link", { name: "Comprar entradas" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dónde ver" }));
    expect(screen.getByText("Pronto anunciaremos dónde ver este evento.")).toBeVisible();
  });
});
