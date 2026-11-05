import { describe, expect, it } from "vitest";
import { parsePostMarkdown } from "@/domain/post-markdown";
import { summarizeDraft } from "./draft-summary";

const PHOTO = "11111111-1111-4111-8111-111111111111";

describe("summarizeDraft", () => {
  it("lists what will be loaded: title, excerpt, paragraphs, photos and each network", () => {
    const draft = parsePostMarkdown(
      ["TÍTULO: Uno", "BAJADA: Dos", "", "Párrafo.", "", "## Sección", "", "Otro.", "", "[FOTO 1]", "", "https://youtu.be/dQw4w9WgXcQ", "", "https://www.instagram.com/p/C8abc123/"].join("\n"),
      [PHOTO],
    );
    expect(summarizeDraft(draft)).toEqual([
      { ok: true, text: "Título: «Uno»" },
      { ok: true, text: "Bajada: «Dos»" },
      { ok: true, text: "2 párrafos" },
      { ok: true, text: "1 título de sección" },
      { ok: true, text: "1 foto" },
      { ok: true, text: "1 video de YouTube" },
      { ok: true, text: "1 publicación de Instagram" },
    ]);
  });

  it("flags a missing title or excerpt (the form keeps what it had)", () => {
    const summary = summarizeDraft(parsePostMarkdown("Solo un párrafo.", []));
    expect(summary).toContainEqual({ ok: false, text: "No trae TÍTULO: el título actual no cambia" });
    expect(summary).toContainEqual({ ok: false, text: "No trae BAJADA: la bajada actual no cambia" });
    expect(summary).toContainEqual({ ok: true, text: "1 párrafo" });
  });

  it("is empty when the text cannot be loaded", () => {
    expect(summarizeDraft({ title: null, excerpt: null, body: null, warnings: [], error: "x" })).toEqual([]);
  });
});
