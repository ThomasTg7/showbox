import { describe, expect, it } from "vitest";
import type { Event } from "@/db/schema/events";
import { EVENT_FIELD_TABS, eventToFormValues, tabForEventField } from "./form-values";
import { parseMapsCoordinates } from "@/domain/maps-link";

const base = { name: "ShowBox Fight Night 5", slug: "gc-5", startsAt: new Date("2026-10-25T00:00:00Z"), eventStatus: "scheduled", doorsAt: null, endsEstimatedAt: null } as unknown as Event;

describe("eventToFormValues — the map", () => {
  it("shows the saved place as a Google Maps link that reads back to the same coordinates", () => {
    const { mapsUrl } = eventToFormValues({ ...base, lat: -33.4372, lng: -70.6506 });
    expect(mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    expect(parseMapsCoordinates(mapsUrl!)).toEqual({ lat: -33.4372, lng: -70.6506 });
  });

  it("leaves the field empty when the event has no place", () => {
    expect(eventToFormValues({ ...base, lat: null, lng: null }).mapsUrl).toBe("");
  });

  it("puts the map field in the place tab", () => {
    expect(EVENT_FIELD_TABS.place).toContain("mapsUrl");
    expect(tabForEventField("mapsUrl")).toBe("place");
  });
});
