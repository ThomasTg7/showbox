import { describe, expect, it } from "vitest";
import { computeRecord, fightSeconds, type BoutOutcomeForRecord } from "./record";

const ME = "fighter-me";
const RIVAL = "fighter-rival";

let counter = 0;
function bout(overrides: Partial<BoutOutcomeForRecord> = {}): BoutOutcomeForRecord {
  counter += 1;
  return {
    boutId: `bout-${counter}`,
    date: new Date(Date.UTC(2026, 0, counter)),
    level: "pro",
    redFighterId: ME,
    blueFighterId: RIVAL,
    outcome: "red_win",
    method: "decision",
    endRound: 3,
    endTimeSeconds: 300,
    roundSeconds: 300,
    ...overrides,
  };
}

describe("fightSeconds", () => {
  it("adds the full rounds fought and the time in the last round", () => {
    expect(fightSeconds({ endRound: 2, endTimeSeconds: 222, roundSeconds: 300 })).toBe(522);
    expect(fightSeconds({ endRound: 1, endTimeSeconds: 45, roundSeconds: 300 })).toBe(45);
  });
});

describe("computeRecord", () => {
  it("counts wins, losses, draws and no contests, from either corner", () => {
    const record = computeRecord(
      [
        bout({ outcome: "red_win" }),
        bout({ redFighterId: RIVAL, blueFighterId: ME, outcome: "blue_win" }),
        bout({ outcome: "blue_win" }),
        bout({ outcome: "draw" }),
        bout({ outcome: "no_contest", method: "no_contest" }),
      ],
      ME,
      "pro",
    );
    expect(record).toMatchObject({ wins: 2, losses: 1, draws: 1, noContests: 1 });
  });

  it("groups technical decisions with decisions and disqualifications apart", () => {
    const record = computeRecord(
      [
        bout({ method: "ko_tko" }),
        bout({ method: "technical_decision" }),
        bout({ method: "disqualification" }),
        bout({ outcome: "blue_win", method: "ko_tko" }),
        bout({ outcome: "blue_win", method: "technical_decision" }),
      ],
      ME,
      "pro",
    );
    expect(record.winsBy).toEqual({ koTko: 1, decision: 1, dq: 1 });
    expect(record.lossesBy).toEqual({ koTko: 1, decision: 1, dq: 0 });
  });

  it("does not let a no contest break or add to a streak", () => {
    const record = computeRecord(
      [bout({ outcome: "red_win" }), bout({ outcome: "red_win" }), bout({ outcome: "no_contest", method: "no_contest" }), bout({ outcome: "red_win" })],
      ME,
      "pro",
    );
    expect(record.streak).toEqual({ type: "win", count: 3 });
    expect(record.noContests).toBe(1);
  });

  it("orders bouts by date, not by the order they are given", () => {
    const early = bout({ date: new Date("2026-01-01"), outcome: "blue_win" });
    const later = bout({ date: new Date("2026-03-01"), outcome: "red_win" });
    const latest = bout({ date: new Date("2026-05-01"), outcome: "red_win" });
    expect(computeRecord([latest, early, later], ME, "pro").streak).toEqual({ type: "win", count: 2 });
  });

  it("reports a losing or drawing streak and null without decided bouts", () => {
    expect(computeRecord([bout({ outcome: "red_win" }), bout({ outcome: "blue_win" }), bout({ outcome: "blue_win" })], ME, "pro").streak).toEqual({
      type: "loss",
      count: 2,
    });
    expect(computeRecord([bout({ outcome: "draw" })], ME, "pro").streak).toEqual({ type: "draw", count: 1 });
    expect(computeRecord([bout({ outcome: "no_contest", method: "no_contest" })], ME, "pro").streak).toBeNull();
    expect(computeRecord([], ME, "pro").streak).toBeNull();
  });

  it("only counts the requested level", () => {
    const bouts = [bout({ level: "amateur" }), bout({ level: "pro", outcome: "blue_win" })];
    expect(computeRecord(bouts, ME, "pro")).toMatchObject({ wins: 0, losses: 1 });
    expect(computeRecord(bouts, ME, "amateur")).toMatchObject({ wins: 1, losses: 0 });
  });

  it("ignores bouts of other fighters", () => {
    expect(computeRecord([bout({ redFighterId: "x", blueFighterId: "y" })], ME, "pro")).toMatchObject({ wins: 0, losses: 0 });
  });

  it("computes the knockout rate as KO/TKO wins over wins, or null with no wins", () => {
    const record = computeRecord(
      [bout({ method: "ko_tko" }), bout({ method: "ko_tko" }), bout({ method: "ko_tko" }), bout({ method: "decision" })],
      ME,
      "pro",
    );
    expect(record.wins).toBe(4);
    expect(record.finishRate).toBe(0.75);
    expect(computeRecord([bout({ outcome: "blue_win" })], ME, "pro").finishRate).toBeNull();
  });

  it("averages the fight length, or null without bouts", () => {
    const record = computeRecord([bout({ endRound: 1, endTimeSeconds: 100 }), bout({ endRound: 2, endTimeSeconds: 200 })], ME, "pro");
    expect(record.avgFightSeconds).toBe((100 + 500) / 2);
    expect(computeRecord([], ME, "pro").avgFightSeconds).toBeNull();
  });
});
