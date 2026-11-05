import { describe, expect, it } from "vitest";
import { isGoogleMapsLink, isShortMapsLink, parseMapsCoordinates } from "./maps-link";

const PIN = { lat: -33.4372, lng: -70.6506 };

describe("parseMapsCoordinates", () => {
  it("prefers the pin (!3d…!4d…) of a place link over the map viewport (@…)", () => {
    const link = "https://www.google.com/maps/place/Arena+Santiago/@-33.4400,-70.6600,17z/data=!3m1!4b1!4m6!3m5!1s0x9662c5:0x1!8m2!3d-33.4372!4d-70.6506!16s%2Fg%2F11";
    expect(parseMapsCoordinates(link)).toEqual(PIN);
  });

  it("reads the viewport of a link that only has @lat,lng", () => {
    expect(parseMapsCoordinates("https://www.google.com/maps/@-33.4372,-70.6506,15z")).toEqual(PIN);
  });

  it("reads lat,lng from q, query, ll and a coordinates-only place", () => {
    expect(parseMapsCoordinates("https://www.google.com/maps?q=-33.4372,-70.6506")).toEqual(PIN);
    expect(parseMapsCoordinates("https://www.google.com/maps/search/?api=1&query=-33.4372%2C-70.6506")).toEqual(PIN);
    expect(parseMapsCoordinates("https://maps.google.com/?ll=-33.4372,-70.6506&z=16")).toEqual(PIN);
    expect(parseMapsCoordinates("https://www.google.com/maps/place/-33.4372,-70.6506")).toEqual(PIN);
  });

  it("follows the continue parameter of a consent page", () => {
    const inner = encodeURIComponent("https://www.google.com/maps/@-33.4372,-70.6506,15z");
    expect(parseMapsCoordinates(`https://consent.google.com/m?continue=${inner}&gl=DE`)).toEqual(PIN);
  });

  it("is null without coordinates, outside the valid range, or for a link that is not a URL", () => {
    expect(parseMapsCoordinates("https://www.google.com/maps/place/Arena+Santiago")).toBeNull();
    expect(parseMapsCoordinates("https://www.google.com/maps?q=-133.4,-70.6")).toBeNull();
    expect(parseMapsCoordinates("no es un enlace")).toBeNull();
  });
});

describe("isGoogleMapsLink", () => {
  it("accepts the Google Maps hosts, short links included, over https", () => {
    for (const link of ["https://www.google.com/maps/@1,2,3z", "https://maps.google.com/?q=1,2", "https://www.google.cl/maps?q=1,2", "https://maps.app.goo.gl/AbC123", "https://goo.gl/maps/AbC123"]) {
      expect(isGoogleMapsLink(link)).toBe(true);
    }
  });

  it("rejects other sites, look-alike hosts, other google services and plain http", () => {
    for (const link of ["https://example.com/maps", "https://www.google.com.evil.cl/maps", "https://evilgoogle.com/maps", "http://www.google.com/maps/@1,2,3z", "https://www.google.com/search?q=1,2", "javascript:alert(1)"]) {
      expect(isGoogleMapsLink(link)).toBe(false);
    }
  });
});

describe("isShortMapsLink", () => {
  it("tells the links that must be resolved from the ones that already carry the place", () => {
    expect(isShortMapsLink("https://maps.app.goo.gl/AbC123")).toBe(true);
    expect(isShortMapsLink("https://goo.gl/maps/AbC123")).toBe(true);
    expect(isShortMapsLink("https://www.google.com/maps/@1,2,3z")).toBe(false);
  });
});
