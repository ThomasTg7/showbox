// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaDTO } from "@/features/media/dto";
import { PhotoGallery } from "./photo-gallery";

afterEach(cleanup);

const photo = (id: string): MediaDTO => ({
  id,
  kind: "gallery",
  width: 1600,
  height: 900,
  focal: { x: 0.5, y: 0.5 },
  alt: `Foto ${id}`,
  variants: [
    { width: 400, height: 225, url: `/m/${id}-400.webp` },
    { width: 1200, height: 675, url: `/m/${id}-1200.webp` },
  ],
  originalUrl: `/m/${id}.png`,
});

const touch = (x: number) => ({ changedTouches: [{ clientX: x, clientY: 100 }], touches: [{ clientX: x, clientY: 100 }] });

describe("PhotoGallery", () => {
  it("opens a photo, moves with the arrow keys and closes with Escape", () => {
    render(<PhotoGallery media={[photo("a"), photo("b"), photo("c")]} title="Galería de prueba" />);
    fireEvent.click(screen.getByRole("button", { name: /Ver foto 1 de 3/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("1 / 3");

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(dialog.textContent).toContain("2 / 3");
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(dialog.textContent).toContain("3 / 3");

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves to the next photo when the finger swipes left and to the previous one when it swipes right", () => {
    render(<PhotoGallery media={[photo("a"), photo("b"), photo("c")]} title="Galería de prueba" />);
    fireEvent.click(screen.getByRole("button", { name: /Ver foto 1 de 3/ }));
    const stage = document.querySelector<HTMLElement>('[data-slot="photo-stage"]')!;

    fireEvent.touchStart(stage, touch(300));
    fireEvent.touchEnd(stage, touch(150));
    expect(screen.getByRole("dialog").textContent).toContain("2 / 3");

    fireEvent.touchStart(stage, touch(100));
    fireEvent.touchEnd(stage, touch(250));
    expect(screen.getByRole("dialog").textContent).toContain("1 / 3");
  });

  it("ignores a short touch (a tap or a tiny drag)", () => {
    render(<PhotoGallery media={[photo("a"), photo("b")]} title="Galería de prueba" />);
    fireEvent.click(screen.getByRole("button", { name: /Ver foto 1 de 2/ }));
    const stage = document.querySelector<HTMLElement>('[data-slot="photo-stage"]')!;
    fireEvent.touchStart(stage, touch(200));
    fireEvent.touchEnd(stage, touch(180));
    expect(screen.getByRole("dialog").textContent).toContain("1 / 2");
  });

  it("loads only the thumbnails until a photo is opened", () => {
    const { container } = render(<PhotoGallery media={[photo("a"), photo("b")]} title="Galería de prueba" />);
    expect(container.querySelectorAll("img")).toHaveLength(2);
    for (const image of container.querySelectorAll("img")) expect(image.getAttribute("sizes")).not.toBe("96vw");
  });
});
