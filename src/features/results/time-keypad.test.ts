import { describe, expect, it } from "vitest";
import { digitsToClock, pressBackspace, pressDigit } from "./time-keypad";

describe("digitsToClock", () => {
  it("fills the clock from the right, like a phone timer", () => {
    expect(digitsToClock("")).toBe("");
    expect(digitsToClock("3")).toBe("0:03");
    expect(digitsToClock("34")).toBe("0:34");
    expect(digitsToClock("342")).toBe("3:42");
    expect(digitsToClock("1000")).toBe("10:00");
    expect(digitsToClock("0")).toBe("0:00");
  });
});

describe("pressDigit and pressBackspace", () => {
  it("adds digits up to four and ignores the rest", () => {
    let digits = "";
    for (const digit of ["3", "4", "2"]) digits = pressDigit(digits, digit);
    expect(digits).toBe("342");
    expect(pressDigit("1000", "5")).toBe("1000");
  });

  it("does not start with zeros that would not show", () => {
    expect(pressDigit("", "0")).toBe("0");
    expect(pressDigit("0", "0")).toBe("0");
    expect(pressDigit("0", "5")).toBe("5");
  });

  it("ignores what is not a digit", () => {
    expect(pressDigit("12", ":")).toBe("12");
    expect(pressDigit("12", "ab")).toBe("12");
  });

  it("removes the last digit", () => {
    expect(pressBackspace("342")).toBe("34");
    expect(pressBackspace("3")).toBe("");
    expect(pressBackspace("")).toBe("");
  });
});
