// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaDTO } from "@/features/media/dto";
import { AdminFighterThumb } from "./admin-fighter-thumb";

afterEach(cleanup);

const photo = (id: string, kind: MediaDTO["kind"]): MediaDTO => ({
  id,
  kind,
  width: 800,
  height: 1200,
  focal: { x: 0.4, y: 0.5 },
  alt: id,
  variants: [{ width: 400, url: `/v/${id}.webp` }],
  originalUrl: `/o/${id}.jpg`,
});

const thumb = (headshotMedia: MediaDTO | null, bodyMedia: MediaDTO | null) =>
  render(<AdminFighterThumb fighter={{ headshotMedia, bodyMedia }} className="size-10" />).container.querySelector("[data-photo]")!;

describe("AdminFighterThumb", () => {
  it("prefers the face photo", () => {
    const node = thumb(photo("rostro", "fighter_headshot"), photo("cuerpo", "fighter_body"));
    expect(node.getAttribute("data-photo")).toBe("headshot");
    expect(node.querySelector("img")?.getAttribute("src")).toBe("/v/rostro.webp");
  });

  it("falls back to the body photo, shown from the top so the face is in view", () => {
    const node = thumb(null, photo("cuerpo", "fighter_body"));
    expect(node.getAttribute("data-photo")).toBe("body");
    expect(node.querySelector("img")?.style.objectPosition).toBe("40% 0%");
  });

  it("shows the silhouette when there is no photo at all", () => {
    const node = thumb(null, null);
    expect(node.getAttribute("data-photo")).toBe("silhouette");
    expect(node.querySelector("svg")).not.toBeNull();
  });
});
