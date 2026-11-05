// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HeroParallax } from "./hero-parallax";

// Un `matchMedia` de mentira que se puede cambiar (como al girar una tablet o agrandar la ventana).
let desktop = false;
const listeners = new Set<() => void>();

function setDesktop(value: boolean) {
  desktop = value;
  act(() => listeners.forEach((listener) => listener()));
}

beforeEach(() => {
  desktop = false;
  listeners.clear();
  window.IntersectionObserver = class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe() {
      this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("min-width") ? desktop : false;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  };
});

afterEach(cleanup);

function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("HeroParallax", () => {
  it("starts moving when the screen becomes wide, and stops (back in place) when it narrows again", () => {
    render(
      <HeroParallax>
        <span>foto</span>
      </HeroParallax>,
    );
    const layer = screen.getByText("foto").parentElement!;

    scrollTo(200);
    expect(layer.style.transform).toBe("");

    setDesktop(true);
    scrollTo(300);
    expect(layer.style.transform).toBe("translate3d(0, 30px, 0)");

    setDesktop(false);
    expect(layer.style.transform).toBe("");
  });
});
