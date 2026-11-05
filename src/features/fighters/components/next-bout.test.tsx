// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FightHistoryRow, NextBoutDTO, OpponentDTO } from "@/features/events/dto";
import type { MediaDTO } from "@/features/media/dto";
import { NextBout } from "./next-bout";

afterEach(cleanup);

const face: MediaDTO = {
  id: "m1",
  kind: "fighter_headshot",
  width: 400,
  height: 500,
  focal: { x: 0.5, y: 0.5 },
  alt: "Jordan Quiñónez, rostro",
  variants: [{ width: 400, height: 500, url: "/media/v/quinonez.webp" }],
  originalUrl: "/media/quinonez.png",
};

const opponent: OpponentDTO = { id: "o1", slug: "jordan-quinonez", firstName: "Jordan", lastName: "Quiñónez", nationality: "AR", isPublic: true, headshotMedia: face, bodyMedia: null };

const next: NextBoutDTO = {
  boutId: "b1",
  isTitleFight: true,
  scheduledRounds: 5,
  roundSeconds: 300,
  divisionName: "Ligero",
  divisionGender: "male",
  catchweightKg: null,
  event: { id: "e1", slug: "showbox-fight-night-5", name: "ShowBox Fight Night 5", startsAt: "2026-10-25T00:00:00.000Z", venueCity: "Santiago" },
  opponent,
};

describe("NextBout", () => {
  it("shows the opponent's photo next to the name, linked to their profile", () => {
    const { container } = render(<NextBout nextBout={next} lastFight={null} />);
    expect(screen.getByRole("img", { name: "Jordan Quiñónez, rostro" })).toBeDefined();
    expect(container.querySelector('[data-slot="opponent-photo"] a')?.getAttribute("href")).toBe("/boxeadores/jordan-quinonez");
    expect(screen.getByText("Próxima pelea")).toBeDefined();
  });

  it("falls back to the opponent's body photo, framed from the top, when there is no headshot", () => {
    const body = { ...face, id: "m-body", kind: "fighter_body" as const, alt: "Jordan Quiñónez, cuerpo" };
    const { container } = render(<NextBout nextBout={{ ...next, opponent: { ...opponent, headshotMedia: null, bodyMedia: body } }} lastFight={null} />);
    expect(screen.getByRole("img", { name: "Jordan Quiñónez, cuerpo" })).toBeDefined();
    expect(container.querySelector('[data-slot="opponent-photo"] [data-photo]')?.getAttribute("data-photo")).toBe("body");
  });

  it("names the photo link after the opponent, so a silhouette-only link is never an empty link for a screen reader", () => {
    const { container } = render(<NextBout nextBout={{ ...next, opponent: { ...opponent, headshotMedia: null } }} lastFight={null} />);
    const link = container.querySelector('[data-slot="opponent-photo"] a');
    expect(link?.getAttribute("aria-label")).toBe("Jordan Quiñónez");
    expect(link?.getAttribute("tabindex")).toBe("-1");
  });

  it("uses the brand silhouette when the opponent has no photo, and no link when they have no profile", () => {
    const { container } = render(<NextBout nextBout={{ ...next, opponent: { ...opponent, headshotMedia: null, isPublic: false } }} lastFight={null} />);
    expect(container.querySelector('[data-slot="opponent-photo"] [data-slot="fighter-silhouette"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="opponent-photo"] a')).toBeNull();
  });

  it("lists the bout's details and the event on separate lines", () => {
    const { container } = render(<NextBout nextBout={next} lastFight={null} />);
    expect(screen.getByText("★ Por el título")).toBeDefined();
    expect(screen.getByText("Peso Ligero")).toBeDefined();
    expect(screen.getByText("5 × 5 MIN")).toBeDefined();
    expect(screen.getByRole("link", { name: "ShowBox Fight Night 5" }).getAttribute("href")).toBe("/eventos/showbox-fight-night-5");
    expect(container).toHaveTextContent("Santiago");
  });

  it("shows the last fight, also with the opponent's photo, when there is no next one", () => {
    const last: FightHistoryRow = {
      boutId: "b0",
      level: "pro",
      fighterResult: "loss",
      methodText: "Descalificación (Golpe bajo)",
      roundTime: "R2 0:58",
      date: "2026-08-29T00:00:00.000Z",
      eventId: "e0",
      eventSlug: "showbox-fight-night-4",
      eventName: "ShowBox Fight Night 4",
      opponent,
    };
    render(<NextBout nextBout={null} lastFight={last} />);
    expect(screen.getByText("Última pelea")).toBeDefined();
    expect(screen.getByRole("img", { name: "Jordan Quiñónez, rostro" })).toBeDefined();
    expect(screen.getByText("Derrota")).toBeDefined();
    expect(screen.getByText("Descalificación (Golpe bajo)")).toBeDefined();
  });

  it("renders nothing without a next or a last fight", () => {
    const { container } = render(<NextBout nextBout={null} lastFight={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
