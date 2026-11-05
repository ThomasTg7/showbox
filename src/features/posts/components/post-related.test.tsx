// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaDTO } from "@/features/media/dto";
import type { PostFighterDTO } from "../dto";
import { PostRelated } from "./post-related";

afterEach(cleanup);

const body: MediaDTO = {
  id: "body",
  kind: "fighter_body",
  width: 800,
  height: 1200,
  focal: { x: 0.5, y: 0.3 },
  alt: "Jordan Quiñónez de cuerpo",
  variants: [{ width: 400, height: 600, url: "/v/quinonez.webp" }],
  originalUrl: "/o/quinonez.png",
};

const fighter = (overrides: Partial<PostFighterDTO>): PostFighterDTO => ({
  id: "f1",
  slug: "jordan-quinonez",
  firstName: "Jordan",
  lastName: "Quiñónez",
  nickname: null,
  nationality: "AR",
  headshotMedia: null,
  bodyMedia: null,
  ...overrides,
});

describe("PostRelated («En esta noticia»)", () => {
  it("shows the body photo, framed from the top, of a fighter without a headshot", () => {
    const { container } = render(<PostRelated fighters={[fighter({ bodyMedia: body })]} events={[]} />);
    expect(screen.getByRole("img", { name: "Jordan Quiñónez de cuerpo" }).style.objectPosition).toBe("50% 0%");
    expect(container.querySelector("[data-photo]")?.getAttribute("data-photo")).toBe("body");
  });

  it("keeps the silhouette only for a fighter without any photo", () => {
    const { container } = render(<PostRelated fighters={[fighter({})]} events={[]} />);
    expect(container.querySelector("[data-photo]")?.getAttribute("data-photo")).toBe("silhouette");
    expect(container.querySelector("img")).toBeNull();
  });
});
