// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCoverVisibility } from "./use-cover-visibility";

afterEach(() => { cleanup(); document.body.replaceChildren(); vi.unstubAllGlobals(); });

for (const route of ["/", "/eventos/showbox-fight-night-5"]) {
  it(`tracks entering and leaving the cover on ${route}`, () => {
    const hero = document.createElement("section");
    hero.dataset.siteHero = "";
    document.body.append(hero);
    let update: IntersectionObserverCallback = () => {};
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { update = callback; }
      observe() {}
      disconnect() {}
    });
    const { result } = renderHook(() => useCoverVisibility(route));
    expect(result.current).toBe(true);
    const report = (bottom: number) => act(() => update([{ boundingClientRect: { bottom } } as IntersectionObserverEntry], {} as IntersectionObserver));
    report(-10);
    expect(result.current).toBe(false);
    report(200);
    expect(result.current).toBe(true);
  });
}

it("does not hide navigation on a listing without a cover", () => {
  const { result } = renderHook(() => useCoverVisibility("/eventos"));
  expect(result.current).toBe(false);
});
