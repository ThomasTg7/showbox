// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Scorecard } from "@/domain/bout-result";
import type { BoutDTO, BoutFighterDTO, BoutResultDTO } from "../dto";
import { JudgesScorecards } from "./judges-scorecards";

afterEach(cleanup);

const fighter = (id: string, firstName: string, lastName: string): BoutFighterDTO => ({
  id,
  slug: lastName.toLowerCase(),
  firstName,
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

function boutWith(result: Partial<BoutResultDTO>, scorecards: Scorecard[]): BoutDTO {
  return {
    id: "b1",
    level: "pro",
    scheduledRounds: 3,
    roundSeconds: 300,
    isTitleFight: false,
    status: "completed",
    cancelReason: null,
    division: { name: "Ligero", slug: "peso-superligero", gender: "male" },
    catchweightKg: null,
    red: fighter("r", "Bryan", "Cevallos"),
    blue: fighter("b", "Jordan", "Quiñónez"),
    result: {
      outcome: "red_win",
      method: "decision",
      endRound: 3,
      endTimeSeconds: 300,
      line: "",
      methodText: "Decisión unánime",
      referee: null,
      scorecards,
      bonuses: [],
      videoUrl: null,
      ...result,
    },
  };
}

const rowOf = (table: HTMLElement, header: string) => within(table).getByRole("rowheader", { name: header }).closest("tr")!;
const cells = (row: HTMLElement) => within(row).getAllByRole("cell").map((cell) => cell.textContent);

describe("JudgesScorecards", () => {
  it("draws each card like the official one: every round with score and deduction, the total and the judge", () => {
    const cards: Scorecard[] = [
      { judge: "Caicedo", red: 28, blue: 28, rounds: [{ red: 10, blue: 9, redDeduction: 1 }, { red: 9, blue: 10 }, { red: 10, blue: 9 }] },
      { judge: "Huamán", red: 29, blue: 28, rounds: [{ red: 10, blue: 9 }, { red: 9, blue: 10 }, { red: 10, blue: 9 }] },
    ];
    const bout = boutWith({}, cards);
    render(<JudgesScorecards bout={bout} scorecards={cards} />);

    const caicedo = screen.getByRole("table", { name: "Tarjeta de Caicedo" });
    expect(cells(rowOf(caicedo, "1"))).toEqual(["10", "−1", "", "9"]);
    expect(cells(rowOf(caicedo, "Total"))).toEqual(["28", "28"]);
    expect(screen.getByRole("heading", { name: "Caicedo" })).toBeDefined();
    expect(screen.getByText("Juez 2")).toBeDefined();
    expect(screen.getAllByText("Esquina roja")).toHaveLength(2);

    // Debajo, el resultado y los puntajes con el del ganador primero.
    const verdict = document.querySelector('[data-slot="scorecards-verdict"]')!;
    expect(verdict.textContent).toContain("Gana Bryan Cevallos · Decisión unánime");
    expect(verdict.textContent).toContain("28-28 · 29-28");
  });

  it("leaves blank the rounds that were not scored, and says how far the cards went in a stoppage", () => {
    const cards: Scorecard[] = [{ judge: "Caicedo", red: 19, blue: 19, rounds: [{ red: 10, blue: 9 }, { red: 9, blue: 10 }] }];
    render(<JudgesScorecards bout={boutWith({ method: "ko_tko", methodText: "KO", endRound: 3 }, cards)} scorecards={cards} />);
    const table = screen.getByRole("table", { name: "Tarjeta de Caicedo" });
    expect(cells(rowOf(table, "3"))).toEqual(["", "", "", ""]);
    expect(screen.getByText("Las tarjetas muestran cómo iba la pelea hasta el round 2")).toBeDefined();
  });
});
