import { describe, expect, it } from "vitest";
import { PLACEMENT_TIERS, isSponsorActive, sponsorValidity } from "./sponsors";

describe("isSponsorActive", () => {
  it("is visible through the whole last day, and gone the next one", () => {
    expect(isSponsorActive({ startsOn: null, endsOn: "2026-10-24" }, "2026-10-24")).toBe(true);
    expect(isSponsorActive({ startsOn: null, endsOn: "2026-10-24" }, "2026-10-25")).toBe(false);
  });

  it("is hidden until its first day, and visible from it", () => {
    expect(isSponsorActive({ startsOn: "2026-10-24", endsOn: null }, "2026-10-23")).toBe(false);
    expect(isSponsorActive({ startsOn: "2026-10-24", endsOn: null }, "2026-10-24")).toBe(true);
  });

  it("an open end (or an open start) never expires", () => {
    expect(isSponsorActive({ startsOn: null, endsOn: null }, "2031-01-01")).toBe(true);
    expect(isSponsorActive({ startsOn: "2026-01-01", endsOn: null }, "2040-01-01")).toBe(true);
    expect(isSponsorActive({ startsOn: null, endsOn: "2026-12-31" }, "2000-01-01")).toBe(true);
  });
});

describe("sponsorValidity", () => {
  it("tells whether it is running, about to start or over", () => {
    expect(sponsorValidity({ startsOn: null, endsOn: null }, "2026-10-24")).toBe("current");
    expect(sponsorValidity({ startsOn: "2026-11-01", endsOn: null }, "2026-10-24")).toBe("upcoming");
    expect(sponsorValidity({ startsOn: null, endsOn: "2026-10-23" }, "2026-10-24")).toBe("expired");
  });
});

describe("PLACEMENT_TIERS", () => {
  it("shows principal and oficial on the home, every tier on an event and only principal in the footer", () => {
    expect(PLACEMENT_TIERS.home).toEqual(["principal", "oficial"]);
    expect(PLACEMENT_TIERS.event).toEqual(["principal", "oficial", "colaborador"]);
    expect(PLACEMENT_TIERS.footer).toEqual(["principal"]);
  });
});
