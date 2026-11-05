// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { Analytics } from "./analytics";

afterEach(() => {
  document.head.innerHTML = "";
});

describe("Analytics", () => {
  it("draws nothing without a provider", () => {
    expect(renderToStaticMarkup(<Analytics config={{ provider: "none" }} />)).toBe("");
  });

  it("draws the Umami script with its website id", () => {
    const html = renderToStaticMarkup(<Analytics config={{ provider: "umami", src: "https://stats.openfightlatam.cl/script.js", websiteId: "abc-123" }} />);
    expect(html).toContain('src="https://stats.openfightlatam.cl/script.js"');
    expect(html).toContain('data-website-id="abc-123"');
    expect(html).toContain("defer");
  });

  it("loads Vercel Analytics in the browser, from its own path and with no cookie", () => {
    render(<Analytics config={{ provider: "vercel" }} />);
    const script = document.querySelector<HTMLScriptElement>("script[src*='insights'], script[src*='vercel-scripts']");
    expect(script).not.toBeNull();
    expect(document.cookie).toBe("");
  });

  it("reads the provider from the environment by default", () => {
    // ANALYTICS_PROVIDER no está en el entorno de los tests.
    expect(renderToStaticMarkup(<Analytics />)).toBe("");
  });
});
