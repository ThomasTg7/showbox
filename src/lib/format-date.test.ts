import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatLongDate, formatPosterDate, formatShortDate, formatTime } from "./format-date";

// 2026-09-29 04:30 UTC = 2026-09-28 23:30 en Ecuador (UTC-5 todo el año).
const lateNightInEcuador = new Date("2026-09-29T04:30:00.000Z");

describe("formatDate", () => {
  it("uses Ecuador's calendar day regardless of the server timezone", () => {
    expect(formatDate(lateNightInEcuador)).toBe("28 sept 2026");
  });
});

describe("formatDateTime", () => {
  it("includes Ecuador's local time", () => {
    expect(formatDateTime(lateNightInEcuador)).toBe("28 sept 2026, 23:30");
  });
});

// 2026-10-25 02:00 UTC = sábado 24-oct 21:00 en Ecuador.
const saturdayNight = new Date("2026-10-25T02:00:00.000Z");

describe("formatTime", () => {
  it("writes the hour of Ecuador as HH:mm", () => {
    expect(formatTime(saturdayNight)).toBe("21:00");
    expect(formatTime(lateNightInEcuador)).toBe("23:30");
  });
});

describe("formatShortDate and formatLongDate", () => {
  it("writes the weekday and the day of Ecuador, not of the server", () => {
    expect(formatShortDate(saturdayNight)).toBe("sáb 24 oct");
    expect(formatLongDate(saturdayNight)).toBe("sábado 24 de octubre de 2026");
  });
});

describe("formatPosterDate", () => {
  it("writes the date like the fight posters: weekday - day - month, in Ecuador", () => {
    expect(formatPosterDate(saturdayNight)).toBe("sábado - 24 - octubre");
    expect(formatPosterDate(new Date("2026-11-15T04:30:00Z"))).toBe("sábado - 14 - noviembre");
  });
});
