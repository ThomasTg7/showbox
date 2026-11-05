import { describe, expect, it } from "vitest";
import { formatClock, parseClock } from "./clock";

describe("parseClock", () => {
  it("reads m:ss and mm:ss as seconds", () => {
    expect(parseClock("3:42")).toBe(222);
    expect(parseClock("03:42")).toBe(222);
    expect(parseClock("5:00")).toBe(300);
    expect(parseClock("0:00")).toBe(0);
    expect(parseClock("10:00")).toBe(600);
  });

  it("ignores surrounding spaces", () => {
    expect(parseClock(" 3:42 ")).toBe(222);
  });

  it("rejects anything that is not m:ss", () => {
    expect(parseClock("342")).toBeNull();
    expect(parseClock("3.42")).toBeNull();
    expect(parseClock("3:60")).toBeNull();
    expect(parseClock("3:4")).toBeNull();
    expect(parseClock("-1:00")).toBeNull();
    expect(parseClock("")).toBeNull();
    expect(parseClock("tres")).toBeNull();
  });
});

describe("formatClock", () => {
  it("writes seconds as m:ss", () => {
    expect(formatClock(222)).toBe("3:42");
    expect(formatClock(300)).toBe("5:00");
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(600)).toBe("10:00");
  });
});
