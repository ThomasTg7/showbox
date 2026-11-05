// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaDTO } from "@/features/media/dto";
import type { BoutDTO, BoutFighterDTO } from "../dto";
import { BoutAccordion } from "./bout-accordion";
import { BoutRow } from "./bout-row";

afterEach(cleanup);

const fighter = (id: string, lastName: string): BoutFighterDTO => ({
  id,
  slug: lastName.toLowerCase(),
  firstName: "Boxeador",
  lastName,
  nickname: null,
  nationality: "CL",
  isPublic: true,
  record: { wins: 1, losses: 0, draws: 0, noContests: 0 },
  heightCm: null,
  weightKg: null,
  reachCm: null,
  headshotMedia: null,
  bodyMedia: null,
});

const bout: BoutDTO = {
  id: "b1",
  level: "pro",
  scheduledRounds: 5,
  roundSeconds: 300,
  isTitleFight: true,
  status: "scheduled",
  cancelReason: null,
  division: { name: "Ligero", slug: "peso-superligero", gender: "male" },
  catchweightKg: null,
  red: fighter("red-1", "Cevallos"),
  blue: fighter("blue-1", "Quiñónez"),
  result: null,
};

const renderRow = (props: { rankLabels?: Record<string, string> } = {}) =>
  render(
    <BoutAccordion>
      <ul>
        <BoutRow bout={bout} eventSlug="showbox-fight-night-5" {...props} />
      </ul>
    </BoutAccordion>,
  ).container;

const labelOf = (container: HTMLElement, side: "red" | "blue") => container.querySelector(`[data-corner="${side}"] [data-slot="bout-rank"]`);

describe("BoutRow rank labels", () => {
  it("spells out «Campeón» for the champion and shows #n for a ranked fighter in the rank slot of each corner", () => {
    const container = renderRow({ rankLabels: { "red-1": "C", "blue-1": "#1" } });
    expect(labelOf(container, "red")?.textContent).toBe("Campeón");
    expect(labelOf(container, "blue")?.textContent).toBe("#1");
  });

  it("says «Campeona» in a women's division", () => {
    const container = render(
      <BoutAccordion>
        <ul>
          <BoutRow bout={{ ...bout, division: { name: "Paja", slug: "peso-mosca-femenino", gender: "female" } }} eventSlug="showbox-fight-night-5" rankLabels={{ "red-1": "C" }} />
        </ul>
      </BoutAccordion>,
    ).container;
    expect(labelOf(container, "red")?.textContent).toBe("Campeona");
  });

  it("leaves the slot empty for a fighter without label", () => {
    const container = renderRow({ rankLabels: { "blue-1": "#3" } });
    expect(labelOf(container, "red")?.textContent).toBe("");
    expect(labelOf(container, "blue")?.textContent).toBe("#3");
  });

  it("works without any labels", () => {
    const container = renderRow();
    expect(labelOf(container, "red")?.textContent).toBe("");
  });
});

describe("BoutRow card", () => {
  const summaryOf = (container: HTMLElement) => container.querySelector('[data-slot="bout-summary"]')!;
  const detailsOf = (container: HTMLElement) => container.querySelector('[data-slot="bout-details"]')!;

  it("announces the title fight and the weight class in the strip at the bottom", () => {
    const container = renderRow();
    expect(container.querySelector('[data-slot="bout-billing"]')?.textContent).toBe("Pelea por el título – Peso Ligero");
  });

  it("shows each corner's record next to its flag", () => {
    const container = renderRow();
    const records = [...container.querySelectorAll('[data-corner] [data-slot="bout-record"]')].map((node) => node.textContent);
    expect(records).toEqual(["1-0-0", "1-0-0"]);
  });

  it("keeps the rounds and nicknames out of the card and shows them under «Ver datos»", () => {
    const container = render(
      <BoutAccordion>
        <ul>
          <BoutRow bout={{ ...bout, red: { ...bout.red, nickname: "El Martillo" } }} eventSlug="showbox-fight-night-5" />
        </ul>
      </BoutAccordion>,
    ).container;
    expect(summaryOf(container).textContent).not.toContain("5 × 5 MIN");
    expect(summaryOf(container).textContent).not.toContain("El Martillo");
    expect(detailsOf(container).textContent).toContain("5 × 5 MIN");
    expect(detailsOf(container).textContent).toContain("El Martillo");
  });

  it("uses the full-body photo when the fighter has one", () => {
    const media: MediaDTO = { id: "m1", kind: "fighter_body", alt: "Cevallos", width: 600, height: 900, focal: { x: 0.5, y: 0.5 }, variants: [{ width: 600, url: "/media/body.webp" }], originalUrl: "/media/body.png" };
    const container = render(
      <BoutAccordion>
        <ul>
          <BoutRow bout={{ ...bout, red: { ...bout.red, bodyMedia: media } }} eventSlug="showbox-fight-night-5" />
        </ul>
      </BoutAccordion>,
    ).container;
    expect(container.querySelector('[data-corner="red"] [data-slot="bout-face"]')?.getAttribute("data-photo")).toBe("body");
    expect(container.querySelector('[data-corner="blue"] [data-slot="bout-face"]')?.getAttribute("data-photo")).toBe("silhouette");
  });
});
