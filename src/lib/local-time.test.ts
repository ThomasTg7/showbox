import { describe, expect, it } from "vitest";
import { fromLocalInputs, isCalendarDay, localToday, toLocalInputs, toLocalIso } from "./local-time";

describe("local time (Ecuador, UTC-5)", () => {
  it("reads a date and time typed in Ecuador time (UTC-5, no daylight saving)", () => {
    expect(fromLocalInputs("2026-10-15", "20:00")?.toISOString()).toBe("2026-10-16T01:00:00.000Z");
    expect(fromLocalInputs("2026-07-01", "12:00")?.toISOString()).toBe("2026-07-01T17:00:00.000Z");
  });

  it("returns null while the date or time is missing or invalid", () => {
    expect(fromLocalInputs("", "12:00")).toBeNull();
    expect(fromLocalInputs("2026-07-01", "")).toBeNull();
    expect(fromLocalInputs("2026-13-40", "12:00")).toBeNull();
  });

  it("splits an instant back into Ecuador date and time inputs", () => {
    expect(toLocalInputs(new Date("2026-10-16T01:00:00Z"))).toEqual({ date: "2026-10-15", time: "20:00" });
    expect(toLocalInputs(new Date("2026-07-01T04:30:00Z"))).toEqual({ date: "2026-06-30", time: "23:30" });
  });

  it("writes an instant with the Ecuador offset (-05:00 all year)", () => {
    expect(toLocalIso(new Date("2026-10-16T01:00:00Z"))).toBe("2026-10-15T20:00:00-05:00");
    expect(toLocalIso(new Date("2031-05-11T01:00:00Z"))).toBe("2031-05-10T20:00:00-05:00");
  });

  it("gives today's Ecuador calendar day, even when UTC is already tomorrow", () => {
    expect(localToday(new Date("2026-10-01T03:30:00Z")).toISOString()).toBe("2026-09-30T12:00:00.000Z");
    expect(localToday(new Date("2026-10-01T15:00:00Z")).toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });

  it("isCalendarDay accepts real days only, and never throws on a month or day out of range", () => {
    expect(isCalendarDay("2024-02-29")).toBe(true);
    for (const value of ["2026-02-29", "2026-02-30", "2026-13-01", "2026-00-10", "2026-04-31", "2026-1-1", "", "hoy"]) {
      expect(isCalendarDay(value)).toBe(false);
    }
  });
});
