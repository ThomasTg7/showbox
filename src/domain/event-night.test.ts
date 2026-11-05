import { describe, expect, it } from "vitest";
import { isEventNight, effectiveEventStatus } from "./event-night";

const startsAt = new Date("2026-10-25T00:00:00.000Z");
const hoursBefore = (hours: number) => new Date(startsAt.getTime() - hours * 60 * 60 * 1000);

describe("isEventNight", () => {
  it("is false a week before the event", () => {
    expect(isEventNight(startsAt, hoursBefore(7 * 24))).toBe(false);
  });

  it("is false the day before, and true from 12 hours before the start", () => {
    expect(isEventNight(startsAt, hoursBefore(24))).toBe(false);
    expect(isEventNight(startsAt, hoursBefore(12.01))).toBe(false);
    expect(isEventNight(startsAt, hoursBefore(12))).toBe(true);
    expect(isEventNight(startsAt, hoursBefore(2))).toBe(true);
  });

  it("stays true once the event has started, however late", () => {
    expect(isEventNight(startsAt, startsAt)).toBe(true);
    expect(isEventNight(startsAt, hoursBefore(-30))).toBe(true);
  });
});

describe("effectiveEventStatus", () => {
  const startsAt = new Date("2026-10-24T00:00:00Z");
  const at = (iso: string) => new Date(iso);

  it("turns a scheduled event live by itself at its start time", () => {
    expect(effectiveEventStatus({ eventStatus: "scheduled", startsAt }, at("2026-10-23T23:59:59Z"))).toBe("scheduled");
    expect(effectiveEventStatus({ eventStatus: "scheduled", startsAt }, at("2026-10-24T00:00:00Z"))).toBe("live");
  });

  it("stays live until the estimated end, or 12 hours without one", () => {
    const endsEstimatedAt = new Date("2026-10-24T04:00:00Z");
    expect(effectiveEventStatus({ eventStatus: "scheduled", startsAt, endsEstimatedAt }, at("2026-10-24T03:59:00Z"))).toBe("live");
    expect(effectiveEventStatus({ eventStatus: "scheduled", startsAt, endsEstimatedAt }, at("2026-10-24T04:00:00Z"))).toBe("scheduled");
    expect(effectiveEventStatus({ eventStatus: "scheduled", startsAt }, at("2026-10-24T11:59:00Z"))).toBe("live");
    expect(effectiveEventStatus({ eventStatus: "scheduled", startsAt }, at("2026-10-24T12:00:00Z"))).toBe("scheduled");
  });

  it("never touches a finished, cancelled or already live event, and accepts ISO text", () => {
    const now = at("2026-10-24T01:00:00Z");
    expect(effectiveEventStatus({ eventStatus: "completed", startsAt }, now)).toBe("completed");
    expect(effectiveEventStatus({ eventStatus: "cancelled", startsAt }, now)).toBe("cancelled");
    expect(effectiveEventStatus({ eventStatus: "live", startsAt: "2026-10-20T00:00:00Z" }, now)).toBe("live");
    expect(effectiveEventStatus({ eventStatus: "scheduled", startsAt: startsAt.toISOString(), endsEstimatedAt: null }, now)).toBe("live");
  });
});
