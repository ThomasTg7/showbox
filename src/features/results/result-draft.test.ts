import { describe, expect, it } from "vitest";
import type { BoutContext } from "@/domain/bout-result";
import { EMPTY_DRAFT, draftFromResult, draftToInput, methodsForOutcome, scorecardRoundCount, setOutcome, suggestFromCards, type ResultDraft } from "./result-draft";

const FIVE_MINUTES: BoutContext = { scheduledRounds: 3, roundSeconds: 300 };
const draft = (overrides: Partial<ResultDraft>): ResultDraft => ({ ...EMPTY_DRAFT, ...overrides });

function errorsOf(input: ResultDraft, ctx = FIVE_MINUTES): Record<string, string> {
  const result = draftToInput(input, ctx);
  if (result.ok) throw new Error("expected errors");
  return result.errors;
}

describe("methodsForOutcome and setOutcome", () => {
  it("offers every method for a win, only decisions for a draw and no contest for a no contest", () => {
    expect(methodsForOutcome("red_win")).toEqual(["ko_tko", "decision", "technical_decision", "disqualification"]);
    expect(methodsForOutcome("blue_win")).toEqual(methodsForOutcome("red_win"));
    expect(methodsForOutcome("draw")).toEqual(["decision", "technical_decision"]);
    expect(methodsForOutcome("no_contest")).toEqual(["no_contest"]);
  });

  it("drops a method that does not fit the new outcome and picks the only one for a no contest", () => {
    expect(setOutcome(draft({ outcome: "red_win", method: "ko_tko" }), "draw").method).toBe("");
    expect(setOutcome(draft({ outcome: "red_win", method: "decision" }), "draw").method).toBe("decision");
    expect(setOutcome(draft({ outcome: "red_win", method: "ko_tko" }), "no_contest").method).toBe("no_contest");
    expect(setOutcome(draft({ outcome: "no_contest", method: "no_contest" }), "blue_win").method).toBe("");
  });
});

describe("draftToInput", () => {
  it("asks for the outcome and the method first", () => {
    expect(errorsOf(EMPTY_DRAFT)).toEqual({ outcome: "Elige el resultado" });
    expect(errorsOf(draft({ outcome: "red_win" }))).toEqual({ method: "Elige el método" });
  });

  it("reads m:ss and turns the strings of a knockout into a valid result", () => {
    const result = draftToInput(draft({ outcome: "red_win", method: "ko_tko", koTkoType: "tko_referee", endRound: "2", endTime: "3:42", referee: " Salas " }), FIVE_MINUTES);
    expect(result).toMatchObject({ ok: true, value: { endRound: 2, endTimeSeconds: 222, koTkoType: "tko_referee", referee: "Salas" } });
  });

  it("rejects 5:30 in a 5:00 round with the message of the domain", () => {
    expect(errorsOf(draft({ outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: "1", endTime: "5:30" })).endTimeSeconds).toBe("El tiempo no puede superar 5:00");
  });

  it("explains the time format when it is not m:ss", () => {
    for (const written of ["342", "3.42", "3:60", "tres"]) {
      expect(errorsOf(draft({ outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: "1", endTime: written })).endTimeSeconds).toBe(
        "Escribe el tiempo como m:ss, por ejemplo 3:42",
      );
    }
  });

  it("does not ask a decision for round and time", () => {
    const result = draftToInput(draft({ outcome: "red_win", method: "decision", decisionType: "unanimous" }), FIVE_MINUTES);
    expect(result).toMatchObject({ ok: true, value: { endRound: 3, endTimeSeconds: 300 } });
  });

  it("ignores a round and a time written earlier once the method is a decision (their fields are hidden)", () => {
    const result = draftToInput(draft({ outcome: "red_win", method: "decision", decisionType: "unanimous", endRound: "2", endTime: "3:42" }), FIVE_MINUTES);
    expect(result).toMatchObject({ ok: true, input: { endRound: null, endTimeSeconds: null }, value: { endRound: 3, endTimeSeconds: 300 } });
  });

  it("turns the scorecards into numbers, dropping the empty rows, and flags a bad score", () => {
    const base = draft({ outcome: "red_win", method: "decision", decisionType: "split" });
    const good = draftToInput({ ...base, scorecards: [{ judge: "Juez 1", red: "29", blue: "28" }, { judge: "", red: "", blue: "" }] }, FIVE_MINUTES);
    expect(good).toMatchObject({ ok: true, value: { scorecards: [{ judge: "Juez 1", red: 29, blue: 28 }] } });
    expect(errorsOf({ ...base, scorecards: [{ judge: "Juez 1", red: "veintinueve", blue: "28" }] }).scorecards).toBeDefined();
    expect(errorsOf({ ...base, scorecards: [{ judge: "", red: "29", blue: "28" }] }).scorecards).toBe("Cada tarjeta necesita el nombre del juez");
  });

  it("adds up the cards written round by round, one row per round fought", () => {
    const base = draft({ outcome: "red_win", method: "decision", decisionType: "unanimous", scorecardMode: "rounds" });
    const rounds = [
      { red: "10", blue: "9" },
      { red: "9", blue: "10" },
      { red: "10", blue: "9" },
    ];
    expect(draftToInput({ ...base, scorecards: [{ judge: "Juez 1", red: "", blue: "", rounds }] }, FIVE_MINUTES)).toMatchObject({
      ok: true,
      value: { scorecards: [{ judge: "Juez 1", red: 29, blue: 28, rounds: [{ red: 10, blue: 9 }, { red: 9, blue: 10 }, { red: 10, blue: 9 }] }] },
    });
    expect(errorsOf({ ...base, scorecards: [{ judge: "Juez 1", red: "", blue: "", rounds: rounds.slice(0, 2) }] }).scorecards).toBe("Completa los puntos de cada round");
  });

  it("scores only the rounds that were fought in a technical decision", () => {
    const technical = draft({ outcome: "red_win", method: "technical_decision", decisionType: "unanimous", endRound: "2", endTime: "1:00", scorecardMode: "rounds" });
    expect(scorecardRoundCount(technical, FIVE_MINUTES)).toBe(2);
    expect(scorecardRoundCount({ ...technical, endRound: "" }, FIVE_MINUTES)).toBe(3);
    expect(scorecardRoundCount(draft({ method: "decision" }), { scheduledRounds: 5 })).toBe(5);
    const rounds = [{ red: "10", blue: "9" }, { red: "10", blue: "9" }, { red: "", blue: "" }];
    expect(draftToInput({ ...technical, scorecards: [{ judge: "Juez 1", red: "", blue: "", rounds }] }, FIVE_MINUTES)).toMatchObject({
      ok: true,
      value: { scorecards: [{ red: 20, blue: 18 }] },
    });
  });

  it("passes the point deductions of each round (blank = none), and scores the finished rounds of a stoppage", () => {
    const tko = draft({ outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: "3", endTime: "1:00", scorecardMode: "rounds" });
    expect(scorecardRoundCount(tko, FIVE_MINUTES)).toBe(2);
    const rounds = [{ red: "10", blue: "9", redDeduction: "1", blueDeduction: "" }, { red: "9", blue: "10" }, { red: "", blue: "" }];
    expect(draftToInput({ ...tko, scorecards: [{ judge: "Juez 1", red: "", blue: "", rounds }] }, FIVE_MINUTES)).toMatchObject({
      ok: true,
      value: { scorecards: [{ red: 18, blue: 19, rounds: [{ red: 10, blue: 9, redDeduction: 1 }, { red: 9, blue: 10 }] }] },
    });
  });

  it("suggests the decision from three to five complete cards, in either mode", () => {
    const totals = draft({ scorecards: ["29-28", "29-28", "28-29"].map((score, index) => ({ judge: `J${index}`, red: score.split("-")[0]!, blue: score.split("-")[1]! })) });
    expect(suggestFromCards(totals, FIVE_MINUTES)).toEqual({ outcome: "red_win", decisionType: "split" });
    expect(suggestFromCards(draft({ scorecards: totals.scorecards.slice(0, 2) }), FIVE_MINUTES)).toBeNull();

    const byRound = draft({
      method: "decision",
      scorecardMode: "rounds",
      scorecards: [0, 1, 2].map((index) => ({ judge: `J${index}`, red: "", blue: "", rounds: [{ red: "9", blue: "10" }, { red: "9", blue: "10" }, { red: "10", blue: "9" }] })),
    });
    expect(suggestFromCards(byRound, FIVE_MINUTES)).toEqual({ outcome: "blue_win", decisionType: "unanimous" });
  });

  it("keeps the details of the chosen method only", () => {
    const result = draftToInput(
      draft({ outcome: "no_contest", method: "no_contest", ncReason: "accidental_foul", endRound: "1", endTime: "1:15", koTkoType: "ko", dqReason: "x" }),
      FIVE_MINUTES,
    );
    expect(result).toMatchObject({ ok: true, value: { ncReason: "accidental_foul", koTkoType: null, dqReason: null } });
  });

  it("passes the input for the server as numbers and nulls", () => {
    const result = draftToInput(draft({ outcome: "blue_win", method: "ko_tko", koTkoType: "rtd", endRound: "2", endTime: "0:45", bonuses: ["ko_of_night"] }), FIVE_MINUTES);
    expect(result).toMatchObject({ ok: true, input: { outcome: "blue_win", koTkoType: "rtd", endRound: 2, endTimeSeconds: 45, bonuses: ["ko_of_night"] } });
  });
});

describe("draftFromResult", () => {
  it("shows a saved result as text again, with the time as m:ss", () => {
    const shown = draftFromResult({
      outcome: "red_win",
      method: "ko_tko",
      koTkoType: "tko_referee",
      decisionType: null,
      dqReason: null,
      ncReason: null,
      ncNote: null,
      endRound: 2,
      endTimeSeconds: 222,
      referee: "Salas",
      scorecards: null,
      bonuses: ["ko_of_night"],
      videoUrl: null,
      notes: "Buen combate",
    });
    expect(shown).toMatchObject({ outcome: "red_win", method: "ko_tko", koTkoType: "tko_referee", endRound: "2", endTime: "3:42", referee: "Salas", notes: "Buen combate", scorecards: [], scorecardMode: "total" });
  });

  it("opens cards saved round by round in that mode", () => {
    const saved = draftFromResult({
      ...draftFromResultBase,
      scorecards: [{ judge: "Caicedo", red: 19, blue: 19, rounds: [{ red: 10, blue: 9 }, { red: 9, blue: 10 }] }],
    });
    expect(saved).toMatchObject({ scorecardMode: "rounds", scorecards: [{ judge: "Caicedo", red: "19", blue: "19", rounds: [{ red: "10", blue: "9" }, { red: "9", blue: "10" }] }] });
  });
});

const draftFromResultBase = {
  outcome: "draw" as const,
  method: "decision" as const,
  koTkoType: null,
  decisionType: "split" as const,
  dqReason: null,
  ncReason: null,
  ncNote: null,
  endRound: 2,
  endTimeSeconds: 300,
  referee: null,
  bonuses: [],
  videoUrl: null,
  notes: null,
};
