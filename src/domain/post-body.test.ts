import { describe, expect, it } from "vitest";
import { bodyHasEmbed, collectBodyMediaIds, DEFAULT_TEXT_ALIGN, EMPTY_POST_BODY, hasPostBodyContent, TEXT_ALIGNS, textAlignOf, validatePostBody } from "./post-body";

const MEDIA_A = "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11";
const MEDIA_B = "9a1c2d3e-4f50-4a6b-8c7d-0e1f2a3b4c5d";

const text = (value: string, marks?: { type: string; attrs?: Record<string, unknown> }[]) => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("validatePostBody", () => {
  it("accepts the empty document", () => {
    expect(validatePostBody(EMPTY_POST_BODY)).toBe(true);
  });

  it("accepts every allowed node and mark", () => {
    const body = doc(
      { type: "heading", attrs: { level: 2 }, content: [text("Título")] },
      { type: "heading", attrs: { level: 3 }, content: [text("Subtítulo")] },
      { type: "paragraph", content: [text("Hola "), text("negrita", [{ type: "bold" }]), text(" y "), text("cursiva", [{ type: "italic" }])] },
      { type: "paragraph", content: [text("un enlace", [{ type: "link", attrs: { href: "https://example.com/a?b=1" } }]), { type: "hardBreak" }, text("fin")] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("uno")] }] }] },
      { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("uno")] }] }] },
      { type: "blockquote", content: [{ type: "paragraph", content: [text("cita")] }] },
      { type: "horizontalRule" },
      { type: "image", attrs: { mediaId: MEDIA_A } },
      { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } },
    );
    expect(validatePostBody(body)).toBe(true);
  });

  it.each([
    ["a code block", doc({ type: "codeBlock", content: [text("alert(1)")] })],
    ["raw html", doc({ type: "html", attrs: { html: "<script>alert(1)</script>" } })],
    ["a heading level 1", doc({ type: "heading", attrs: { level: 1 }, content: [text("Gigante")] })],
    ["a heading level 4", doc({ type: "heading", attrs: { level: 4 }, content: [text("Pequeño")] })],
    ["an underline mark", doc({ type: "paragraph", content: [text("sub", [{ type: "underline" }])] })],
    ["a style attribute on a mark", doc({ type: "paragraph", content: [text("x", [{ type: "textStyle", attrs: { color: "red" } }])] })],
    ["a javascript link", doc({ type: "paragraph", content: [text("x", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])] })],
    ["a data link", doc({ type: "paragraph", content: [text("x", [{ type: "link", attrs: { href: "data:text/html,<b>" } }])] })],
    ["an image without a valid media id", doc({ type: "image", attrs: { mediaId: "../../etc/passwd" } })],
    ["an embed from an unknown network", doc({ type: "embed", attrs: { provider: "facebook", id: "123" } })],
    ["an embed with a malformed id", doc({ type: "embed", attrs: { provider: "youtube", id: "corto" } })],
    ["an embed id that smuggles a url", doc({ type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ/../x" } })],
    ["a document that is not a doc", { type: "paragraph", content: [] }],
    ["a node that is not an object", doc("texto suelto")],
    ["null", null],
    ["a string", "<p>hola</p>"],
  ])("rejects %s", (_name, body) => {
    expect(validatePostBody(body)).toBe(false);
  });

  it("rejects text that is not allowed at the top level of the document", () => {
    expect(validatePostBody(doc(text("suelto")))).toBe(false);
  });

  it("rejects a nested document that is too deep", () => {
    let node: unknown = { type: "paragraph", content: [text("fondo")] };
    for (let level = 0; level < 20; level += 1) node = { type: "blockquote", content: [node] };
    expect(validatePostBody(doc(node))).toBe(false);
  });

  it("rejects a document with too many nodes", () => {
    const paragraphs = Array.from({ length: 5001 }, () => ({ type: "paragraph", content: [text("x")] }));
    expect(validatePostBody(doc(...paragraphs))).toBe(false);
  });

  it("allows relative links inside the site", () => {
    expect(validatePostBody(doc({ type: "paragraph", content: [text("eventos", [{ type: "link", attrs: { href: "/eventos" } }])] }))).toBe(true);
  });
});

describe("validatePostBody without media", () => {
  const withoutMedia = { allowMedia: false };

  it("rejects images and embeds but keeps every other node", () => {
    expect(validatePostBody(doc({ type: "image", attrs: { mediaId: MEDIA_A } }), withoutMedia)).toBe(false);
    expect(validatePostBody(doc({ type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } }), withoutMedia)).toBe(false);
    expect(validatePostBody(doc({ type: "blockquote", content: [{ type: "image", attrs: { mediaId: MEDIA_A } }] }), withoutMedia)).toBe(false);
    expect(validatePostBody(doc({ type: "paragraph", content: [text("Hola")] }, { type: "horizontalRule" }), withoutMedia)).toBe(true);
  });

  it("still accepts them by default", () => {
    expect(validatePostBody(doc({ type: "image", attrs: { mediaId: MEDIA_A } }))).toBe(true);
  });
});

describe("hasPostBodyContent", () => {
  it("is false for the empty document, blank paragraphs and anything that is not a document", () => {
    expect(hasPostBodyContent(EMPTY_POST_BODY)).toBe(false);
    expect(hasPostBodyContent(doc({ type: "paragraph", content: [text("   ")] }, { type: "paragraph" }))).toBe(false);
    expect(hasPostBodyContent(doc({ type: "horizontalRule" }))).toBe(false);
    expect(hasPostBodyContent(null)).toBe(false);
    expect(hasPostBodyContent("texto")).toBe(false);
  });

  it("is true when there is text, also inside a list or a quote, or an image or embed", () => {
    expect(hasPostBodyContent(doc({ type: "paragraph", content: [text("Hola")] }))).toBe(true);
    expect(hasPostBodyContent(doc({ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("uno")] }] }] }))).toBe(true);
    expect(hasPostBodyContent(doc({ type: "blockquote", content: [{ type: "paragraph", content: [text("cita")] }] }))).toBe(true);
    expect(hasPostBodyContent(doc({ type: "image", attrs: { mediaId: MEDIA_A } }))).toBe(true);
    expect(hasPostBodyContent(doc({ type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } }))).toBe(true);
  });
});

describe("bodyHasEmbed", () => {
  const embed = { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } };

  it("is true when the text has a social post or video, also inside a quote", () => {
    expect(bodyHasEmbed(doc({ type: "paragraph", content: [text("Mira")] }, embed))).toBe(true);
    expect(bodyHasEmbed(doc({ type: "blockquote", content: [embed] }))).toBe(true);
  });

  it("is false for text, images, the empty document and anything that is not a document", () => {
    expect(bodyHasEmbed(doc({ type: "paragraph", content: [text("Solo texto")] }, { type: "image", attrs: { mediaId: MEDIA_A } }))).toBe(false);
    expect(bodyHasEmbed(EMPTY_POST_BODY)).toBe(false);
    expect(bodyHasEmbed(null)).toBe(false);
    expect(bodyHasEmbed("embed")).toBe(false);
  });
});

describe("collectBodyMediaIds", () => {
  it("lists each image once, in the order it appears, including inside quotes", () => {
    const body = doc(
      { type: "image", attrs: { mediaId: MEDIA_B } },
      { type: "blockquote", content: [{ type: "image", attrs: { mediaId: MEDIA_A } }] },
      { type: "image", attrs: { mediaId: MEDIA_B } },
    );
    expect(collectBodyMediaIds(body)).toEqual([MEDIA_B, MEDIA_A]);
  });

  it("returns nothing for a body without images or one that is not a document", () => {
    expect(collectBodyMediaIds(EMPTY_POST_BODY)).toEqual([]);
    expect(collectBodyMediaIds(null)).toEqual([]);
  });
});

describe("text alignment", () => {
  const aligned = (type: "paragraph" | "heading", textAlign: unknown) => ({
    type: "doc",
    content: [{ type, attrs: { ...(type === "heading" ? { level: 2 } : {}), textAlign }, content: [{ type: "text", text: "Hola" }] }],
  });

  it("accepts justify, left, center and right on paragraphs and headings, or no alignment", () => {
    for (const align of [...TEXT_ALIGNS, null]) {
      expect(validatePostBody(aligned("paragraph", align))).toBe(true);
      expect(validatePostBody(aligned("heading", align))).toBe(true);
    }
  });

  it("rejects any other alignment", () => {
    expect(validatePostBody(aligned("paragraph", "start"))).toBe(false);
    expect(validatePostBody(aligned("heading", "center; color:red"))).toBe(false);
  });

  it("justifies by default", () => {
    expect(DEFAULT_TEXT_ALIGN).toBe("justify");
    expect(textAlignOf({ type: "paragraph" })).toBe("justify");
    expect(textAlignOf({ type: "paragraph", attrs: { textAlign: "center" } })).toBe("center");
    expect(textAlignOf({ type: "paragraph", attrs: { textAlign: "bogus" } })).toBe("justify");
  });
});
