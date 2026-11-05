import { describe, expect, it, vi } from "vitest";
import { locationFromMapsLink } from "./location";

const PIN = { lat: -33.4372, lng: -70.6506 };
const LONG = "https://www.google.com/maps/place/Arena/@-33.44,-70.66,17z/data=!3d-33.4372!4d-70.6506";

/** Un `fetch` falso que responde a cada URL con la redirección que se le diga. */
function fakeFetch(redirects: Record<string, string>) {
  return vi.fn(async (input: string | URL | Request) => {
    const target = redirects[String(input)];
    return target ? new Response(null, { status: 302, headers: { location: target } }) : new Response(null, { status: 200 });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("locationFromMapsLink", () => {
  it("reads a long link without going to the network", async () => {
    const fetchSpy = fakeFetch({});
    expect(await locationFromMapsLink(LONG, fetchSpy)).toEqual(PIN);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("follows a short link to the place it points at", async () => {
    const fetchSpy = fakeFetch({ "https://maps.app.goo.gl/AbC123": LONG });
    expect(await locationFromMapsLink("https://maps.app.goo.gl/AbC123", fetchSpy)).toEqual(PIN);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("follows several redirections, a consent page included", async () => {
    const consent = `https://consent.google.com/m?continue=${encodeURIComponent(LONG)}`;
    const fetchSpy = fakeFetch({ "https://maps.app.goo.gl/AbC123": "https://goo.gl/maps/Next", "https://goo.gl/maps/Next": consent });
    expect(await locationFromMapsLink("https://maps.app.goo.gl/AbC123", fetchSpy)).toEqual(PIN);
  });

  it("never follows a redirection to another site", async () => {
    const fetchSpy = fakeFetch({ "https://maps.app.goo.gl/AbC123": "https://evil.example.com/steal" });
    expect(await locationFromMapsLink("https://maps.app.goo.gl/AbC123", fetchSpy)).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("gives up on a loop of redirections, on a failed request and on a link that is not from Google Maps", async () => {
    const loop = fakeFetch({ "https://maps.app.goo.gl/A": "https://maps.app.goo.gl/B", "https://maps.app.goo.gl/B": "https://maps.app.goo.gl/A" });
    expect(await locationFromMapsLink("https://maps.app.goo.gl/A", loop)).toBeNull();
    const failing = vi.fn(async () => {
      throw new Error("sin red");
    }) as unknown as typeof fetch;
    expect(await locationFromMapsLink("https://maps.app.goo.gl/A", failing)).toBeNull();
    const other = fakeFetch({});
    expect(await locationFromMapsLink("https://example.com/maps", other)).toBeNull();
    expect(other).not.toHaveBeenCalled();
  });
});
