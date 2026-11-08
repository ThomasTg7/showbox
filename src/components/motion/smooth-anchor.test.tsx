// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmoothAnchor } from "./smooth-anchor";

const { getLenis } = vi.hoisted(() => ({ getLenis: vi.fn() }));
vi.mock("./smooth-scroll", () => ({ useLenis: getLenis }));

const scrollIntoView = vi.fn();

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce"), media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  scrollIntoView.mockClear();
  getLenis.mockReset().mockReturnValue(null);
  Element.prototype.scrollIntoView = scrollIntoView;
  mockReducedMotion(false);
});
afterEach(cleanup);

function renderAnchor() {
  render(
    <>
      <SmoothAnchor href="#cartelera">Ver cartelera</SmoothAnchor>
      <section id="cartelera" />
    </>,
  );
}

describe("SmoothAnchor", () => {
  it("synchronizes Lenis with native scroll before resolving the target", () => {
    const resize = vi.fn();
    const scrollTo = vi.fn();
    getLenis.mockReturnValue({ resize, scrollTo });
    renderAnchor();
    fireEvent.click(screen.getByRole("link", { name: "Ver cartelera" }));
    expect(resize).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith(document.getElementById("cartelera"), { duration: 1.3 });
    expect(resize.mock.invocationCallOrder[0]).toBeLessThan(scrollTo.mock.invocationCallOrder[0]!);
  });

  it("scrolls to the section smoothly instead of jumping", () => {
    renderAnchor();
    const link = screen.getByRole("link", { name: "Ver cartelera" });
    expect(fireEvent.click(link)).toBe(false); // el salto del navegador se cancela
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("jumps straight there when the person asked for less motion", () => {
    mockReducedMotion(true);
    renderAnchor();
    fireEvent.click(screen.getByRole("link", { name: "Ver cartelera" }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("keeps the default behaviour when the section does not exist", () => {
    render(<SmoothAnchor href="#no-existe">Nada</SmoothAnchor>);
    expect(fireEvent.click(screen.getByRole("link", { name: "Nada" }))).toBe(true);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
