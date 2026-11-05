import { describe, expect, it } from "vitest";
import type { MediaDTO } from "@/features/media/dto";
import { buildLivePreviewPost, isLivePreviewMessage, LIVE_PREVIEW_MESSAGE } from "./live-preview";

const media = (id: string): MediaDTO => ({ id, kind: "gallery", alt: id, originalUrl: `/media/${id}`, width: 1600, height: 900, focalX: 0.5, focalY: 0.5, variants: [] }) as unknown as MediaDTO;

const CATEGORIES = [{ id: "c1", slug: "anuncios", name: "Anuncios" }];
const NOW = new Date("2026-10-01T15:00:00.000Z");
const BASE = {
  title: "Cevallos retiene",
  excerpt: "Bajada.",
  categoryId: "c1",
  categories: CATEGORIES,
  cover: null,
  gallery: [],
  body: { type: "doc" as const, content: [{ type: "image", attrs: { mediaId: "b1" } }] },
  media: { b1: media("b1"), other: media("other") },
  publication: { status: "draft" as const, publishAt: null },
  now: NOW,
};

describe("buildLivePreviewPost", () => {
  it("builds the public article from what the form has right now", () => {
    const post = buildLivePreviewPost(BASE);
    expect(post.title).toBe("Cevallos retiene");
    expect(post.excerpt).toBe("Bajada.");
    expect(post.category).toEqual({ slug: "anuncios", name: "Anuncios" });
    expect(post.date).toBe(NOW.toISOString());
    expect(post.updatedAt).toBe(NOW.toISOString());
    // Solo las imágenes que están en el cuerpo.
    expect(Object.keys(post.bodyMedia)).toEqual(["b1"]);
    expect(post.fighters).toEqual([]);
  });

  it("uses placeholders for an empty title, excerpt and category so the layout can be judged", () => {
    const post = buildLivePreviewPost({ ...BASE, title: "  ", excerpt: "", categoryId: "" });
    expect(post.title).toBe("Título de la noticia");
    expect(post.excerpt).toBeNull();
    expect(post.category.name).toBe("Categoría");
  });

  it("dates a scheduled article on its scheduled date", () => {
    const publishAt = new Date("2026-10-05T13:00:00.000Z");
    expect(buildLivePreviewPost({ ...BASE, publication: { status: "scheduled", publishAt } }).date).toBe(publishAt.toISOString());
  });

  it("gives a scheduled article the same date as its last change", () => {
    const publishAt = new Date("2026-10-05T13:00:00.000Z");
    expect(buildLivePreviewPost({ ...BASE, publication: { status: "scheduled", publishAt } }).updatedAt).toBe(publishAt.toISOString());
  });
});

describe("isLivePreviewMessage", () => {
  it("accepts only a message of this type with a post", () => {
    const post = buildLivePreviewPost(BASE);
    expect(isLivePreviewMessage({ type: LIVE_PREVIEW_MESSAGE, post })).toBe(true);
    expect(isLivePreviewMessage({ type: "otra-cosa", post })).toBe(false);
    expect(isLivePreviewMessage({ type: LIVE_PREVIEW_MESSAGE })).toBe(false);
    expect(isLivePreviewMessage("texto")).toBe(false);
  });
});
