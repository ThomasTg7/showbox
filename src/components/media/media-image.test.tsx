// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaDTO } from "@/features/media/dto";
import { MediaImage } from "./media-image";

const media: MediaDTO = {
  id: "m1",
  kind: "fighter_body",
  width: 2000,
  height: 3000,
  focal: { x: 0.5, y: 0.2 },
  alt: "Boxeador con guantes",
  variants: [
    { width: 400, height: 600, url: "/media/variants/m1/v1/400.webp" },
    { width: 800, height: 1200, url: "/media/variants/m1/v1/800.webp" },
    { width: 1200, height: 1800, url: "/media/variants/m1/v1/1200.webp" },
  ],
  originalUrl: "/media/originals/fighter_body/m1.jpg",
};

describe("MediaImage", () => {
  afterEach(cleanup);

  it("builds the srcset from the variants and positions the image on the focal point", () => {
    render(<MediaImage media={media} sizes="(min-width: 1024px) 400px, 50vw" />);

    const img = screen.getByRole("img", { name: "Boxeador con guantes" });
    expect(img).toHaveAttribute(
      "srcset",
      "/media/variants/m1/v1/400.webp 400w, /media/variants/m1/v1/800.webp 800w, /media/variants/m1/v1/1200.webp 1200w",
    );
    expect(img).toHaveAttribute("sizes", "(min-width: 1024px) 400px, 50vw");
    expect(img.style.objectPosition).toBe("50% 20%");
  });

  it("falls back to the largest variant for browsers without srcset", () => {
    render(<MediaImage media={media} sizes="100vw" />);

    expect(screen.getByRole("img")).toHaveAttribute("src", "/media/variants/m1/v1/1200.webp");
  });

  it("declares the size of the result so the page reserves its space (no layout shift)", () => {
    render(<MediaImage media={media} sizes="100vw" />);

    expect(screen.getByRole("img")).toHaveAttribute("width", "1200");
    expect(screen.getByRole("img")).toHaveAttribute("height", "1800");
  });

  it("loads lazily by default", () => {
    render(<MediaImage media={media} sizes="100vw" />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("loads eagerly with high priority for the LCP image", () => {
    render(<MediaImage media={media} sizes="100vw" priority />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("uses the original for SVG logos, which have no variants", () => {
    render(<MediaImage media={{ ...media, kind: "sponsor_logo", variants: [], originalUrl: "/media/originals/sponsor_logo/l.svg" }} sizes="200px" />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/media/originals/sponsor_logo/l.svg");
    expect(img).not.toHaveAttribute("srcset");
  });

  it("passes className to the image", () => {
    render(<MediaImage media={media} sizes="100vw" className="size-full object-cover" />);

    expect(screen.getByRole("img")).toHaveClass("size-full", "object-cover");
  });
});

describe("MediaImage anchorTop", () => {
  it("keeps the horizontal focal point but shows the top of the photo", () => {
    const media = { id: "m", kind: "fighter_body" as const, width: 1200, height: 1800, focal: { x: 0.3, y: 0.5 }, alt: "Cevallos", variants: [{ width: 400, url: "/v/400.webp" }], originalUrl: "/o.jpg" };
    const { container } = render(<MediaImage media={media} sizes="100px" anchorTop />);
    expect(container.querySelector("img")?.style.objectPosition).toBe("30% 0%");
  });
});
