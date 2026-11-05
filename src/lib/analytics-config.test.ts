import { describe, expect, it } from "vitest";
import { analyticsConfig } from "./analytics-config";

describe("analyticsConfig", () => {
  it("is off unless a provider is chosen", () => {
    expect(analyticsConfig({})).toEqual({ provider: "none" });
    expect(analyticsConfig({ ANALYTICS_PROVIDER: "none" })).toEqual({ provider: "none" });
    expect(analyticsConfig({ ANALYTICS_PROVIDER: "google" })).toEqual({ provider: "none" });
    expect(analyticsConfig({ ANALYTICS_PROVIDER: "" })).toEqual({ provider: "none" });
  });

  it("turns Vercel Analytics on", () => {
    expect(analyticsConfig({ ANALYTICS_PROVIDER: "vercel" })).toEqual({ provider: "vercel" });
    expect(analyticsConfig({ ANALYTICS_PROVIDER: " Vercel " })).toEqual({ provider: "vercel" });
  });

  it("turns Umami on only with its script and website id", () => {
    const env = { ANALYTICS_PROVIDER: "umami", UMAMI_SRC: "https://stats.showbox.test/script.js", UMAMI_WEBSITE_ID: "0b1c2d3e-aaaa-bbbb-cccc-1234567890ab" };
    expect(analyticsConfig(env)).toEqual({ provider: "umami", src: "https://stats.showbox.test/script.js", websiteId: "0b1c2d3e-aaaa-bbbb-cccc-1234567890ab" });
    expect(analyticsConfig({ ...env, UMAMI_SRC: "" })).toEqual({ provider: "none" });
    expect(analyticsConfig({ ...env, UMAMI_WEBSITE_ID: "" })).toEqual({ provider: "none" });
  });

  it("never loads a script that is not an http(s) URL, nor an id that could break the tag", () => {
    const env = { ANALYTICS_PROVIDER: "umami", UMAMI_SRC: "https://stats.showbox.test/script.js", UMAMI_WEBSITE_ID: "abc-123" };
    expect(analyticsConfig({ ...env, UMAMI_SRC: "javascript:alert(1)" })).toEqual({ provider: "none" });
    expect(analyticsConfig({ ...env, UMAMI_SRC: "/script.js" })).toEqual({ provider: "none" });
    expect(analyticsConfig({ ...env, UMAMI_WEBSITE_ID: 'x" onload="alert(1)' })).toEqual({ provider: "none" });
  });
});
