import { describe, expect, it } from "vitest";
import { looksLikeAiDraft, parsePostMarkdown, postToMarkdown } from "./post-markdown";
import { validatePostBody, type PostBody, type PostNode } from "./post-body";

const PHOTO_1 = "11111111-1111-4111-8111-111111111111";
const PHOTO_2 = "22222222-2222-4222-8222-222222222222";

const text = (value: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): PostNode => (marks ? { type: "text", text: value, marks } : { type: "text", text: value });
const paragraph = (...content: PostNode[]): PostNode => ({ type: "paragraph", content });

describe("parsePostMarkdown: title and excerpt", () => {
  it("reads TÍTULO and BAJADA from the top and leaves them out of the body", () => {
    const draft = parsePostMarkdown("TÍTULO: Cevallos retiene el cinturón\nBAJADA: Ganó por decisión unánime.\n\nPrimer párrafo.", []);
    expect(draft.title).toBe("Cevallos retiene el cinturón");
    expect(draft.excerpt).toBe("Ganó por decisión unánime.");
    expect(draft.body).toEqual({ type: "doc", content: [paragraph(text("Primer párrafo."))] });
  });

  it("accepts the labels in bold, without accent and with a separator line after them", () => {
    const draft = parsePostMarkdown("**Titulo:** Uno\n**Bajada:** Dos\n---\nTexto.", []);
    expect(draft.title).toBe("Uno");
    expect(draft.excerpt).toBe("Dos");
    expect(draft.body?.content).toEqual([paragraph(text("Texto."))]);
  });

  it("treats an empty TÍTULO or BAJADA as missing (it never erases what the form has)", () => {
    const draft = parsePostMarkdown("TÍTULO:\nBAJADA:   \n\nTexto.", []);
    expect(draft.title).toBeNull();
    expect(draft.excerpt).toBeNull();
    expect(draft.body?.content).toEqual([paragraph(text("Texto."))]);
  });

  it("drops a short chat line the AI writes before TÍTULO (it never ends up in the body)", () => {
    const draft = parsePostMarkdown("¡Claro! Aquí tienes la noticia:\n\n**TÍTULO:** Uno\nBAJADA: Dos\n\nTexto.", []);
    expect(draft.title).toBe("Uno");
    expect(draft.excerpt).toBe("Dos");
    expect(draft.body?.content).toEqual([paragraph(text("Texto."))]);
  });

  it("keeps the text when the TÍTULO label shows up far into it (it is part of the news, not a header)", () => {
    const draft = parsePostMarkdown("Uno.\n\nDos.\n\nTres.\n\nCuatro.\n\nTÍTULO: tarde", []);
    expect(draft.title).toBeNull();
    expect(draft.body?.content).toHaveLength(5);
  });

  it("returns null title and excerpt when the text has none", () => {
    const draft = parsePostMarkdown("Solo texto.", []);
    expect(draft.title).toBeNull();
    expect(draft.excerpt).toBeNull();
  });

  it("warns when the title or excerpt is longer than the form allows", () => {
    const draft = parsePostMarkdown(`TÍTULO: ${"a".repeat(141)}\nBAJADA: ${"b".repeat(301)}`, []);
    expect(draft.warnings).toEqual(["El título tiene 141 caracteres (máximo 140).", "La bajada tiene 301 caracteres (máximo 300)."]);
  });

  it("ignores a code fence wrapped around the whole answer", () => {
    const draft = parsePostMarkdown("```markdown\nTÍTULO: Uno\n\nTexto.\n```", []);
    expect(draft.title).toBe("Uno");
    expect(draft.body?.content).toEqual([paragraph(text("Texto."))]);
  });
});

describe("parsePostMarkdown: blocks", () => {
  it("turns # and ## into a title (H2) and ### or more into a subtitle (H3)", () => {
    const body = parsePostMarkdown("# Uno\n## Dos\n### Tres\n#### Cuatro", []).body!;
    expect(body.content!.map((node) => node.attrs?.level)).toEqual([2, 2, 3, 3]);
    expect(body.content![2]).toEqual({ type: "heading", attrs: { level: 3 }, content: [text("Tres")] });
  });

  it("joins the lines of a paragraph with a space and splits paragraphs on blank lines", () => {
    const body = parsePostMarkdown("Una línea\nque sigue.\n\nOtro párrafo.", []).body!;
    expect(body.content).toEqual([paragraph(text("Una línea que sigue.")), paragraph(text("Otro párrafo."))]);
  });

  it("reads bullet and numbered lists, even when the AI leaves blank lines between items", () => {
    const body = parsePostMarkdown("- uno\n* dos\n\n- tres\n\n1. primero\n2) segundo", []).body!;
    expect(body.content).toEqual([
      { type: "bulletList", content: ["uno", "dos", "tres"].map((item) => ({ type: "listItem", content: [paragraph(text(item))] })) },
      { type: "orderedList", content: ["primero", "segundo"].map((item) => ({ type: "listItem", content: [paragraph(text(item))] })) },
    ]);
  });

  it("reads a quote over several lines, with paragraphs inside", () => {
    const body = parsePostMarkdown("> «Vengo a ganar»\n> dijo Quiñónez.\n>\n> Otra frase.", []).body!;
    expect(body.content).toEqual([{ type: "blockquote", content: [paragraph(text("«Vengo a ganar» dijo Quiñónez.")), paragraph(text("Otra frase."))] }]);
  });

  it("reads a separator line", () => {
    expect(parsePostMarkdown("Antes.\n\n---\n\nDespués.", []).body!.content![1]).toEqual({ type: "horizontalRule" });
  });

  it("turns a link of Instagram, YouTube or TikTok alone on its line into an embed, also inside <> or as a markdown link", () => {
    const body = parsePostMarkdown(
      "https://www.instagram.com/reel/C9xYz12AbCd/?igsh=MWQ1ZGUxMzBkMA==\n<https://youtu.be/dQw4w9WgXcQ>\n[Mira el video](https://www.youtube.com/shorts/dQw4w9WgXcQ)",
      [],
    ).body!;
    expect(body.content).toEqual([
      { type: "embed", attrs: { provider: "instagram", id: "C9xYz12AbCd" } },
      { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } },
      { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } },
    ]);
  });

  it("keeps a sentence with a network link and puts the video or post right after it", () => {
    const youtube = { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } };
    const bare = parsePostMarkdown("Mira el video: https://youtu.be/dQw4w9WgXcQ\n\nSigue.", []).body!;
    expect(bare.content).toEqual([
      paragraph(text("Mira el video: "), text("https://youtu.be/dQw4w9WgXcQ", [{ type: "link", attrs: { href: "https://youtu.be/dQw4w9WgXcQ" } }])),
      youtube,
      paragraph(text("Sigue.")),
    ]);
    const linked = parsePostMarkdown("Revive [la pelea](https://www.youtube.com/watch?v=dQw4w9WgXcQ) y [otra vez](https://youtu.be/dQw4w9WgXcQ).", []).body!;
    expect(linked.content?.map((node) => node.type)).toEqual(["paragraph", "embed"]);
    expect(linked.content?.[1]).toEqual(youtube);
  });

  it("turns a Facebook post alone on its line into an embed", () => {
    const body = parsePostMarkdown("https://www.facebook.com/GuerraCampalMMA/posts/pfbid02AbC", []).body!;
    expect(body.content).toEqual([{ type: "embed", attrs: { provider: "facebook", id: "GuerraCampalMMA/posts/pfbid02AbC" } }]);
  });

  it("keeps any other link alone on its line as a linked paragraph", () => {
    const body = parsePostMarkdown("https://www.puntoticket.com/ofl", []).body!;
    expect(body.content).toEqual([paragraph(text("https://www.puntoticket.com/ofl", [{ type: "link", attrs: { href: "https://www.puntoticket.com/ofl" } }]))]);
  });

  it("puts photo N where [FOTO N] is, and warns about a number that was not uploaded", () => {
    const draft = parsePostMarkdown("[FOTO 2]\n\n[foto 1]\n\n[FOTO 3]", [PHOTO_1, PHOTO_2]);
    expect(draft.body!.content).toEqual([
      { type: "image", attrs: { mediaId: PHOTO_2 } },
      { type: "image", attrs: { mediaId: PHOTO_1 } },
    ]);
    expect(draft.warnings).toEqual(["[FOTO 3] no se insertó: solo hay 2 fotos subidas."]);
  });

  it("returns the empty body for an empty answer", () => {
    expect(parsePostMarkdown("TÍTULO: Solo título", []).body).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("parsePostMarkdown: inline format and safety", () => {
  it("reads bold, italic and links, nested too", () => {
    const body = parsePostMarkdown("Ganó **por *KO*** en el [primer round](https://example.com/r1) y _sigue_ invicto.", []).body!;
    expect(body.content).toEqual([
      paragraph(
        text("Ganó "),
        text("por ", [{ type: "bold" }]),
        text("KO", [{ type: "bold" }, { type: "italic" }]),
        text(" en el "),
        text("primer round", [{ type: "link", attrs: { href: "https://example.com/r1" } }]),
        text(" y "),
        text("sigue", [{ type: "italic" }]),
        text(" invicto."),
      ),
    ]);
  });

  it("links a bare address inside the text, without the final period", () => {
    const body = parsePostMarkdown("Entradas en https://example.com/entradas.", []).body!;
    expect(body.content).toEqual([paragraph(text("Entradas en "), text("https://example.com/entradas", [{ type: "link", attrs: { href: "https://example.com/entradas" } }]), text("."))]);
  });

  it("keeps an unsafe link as plain text and never lets HTML through as markup", () => {
    const draft = parsePostMarkdown('[clic](javascript:alert(1)) <script>alert(1)</script> <img src=x onerror="alert(1)">', []);
    const serialized = JSON.stringify(draft.body);
    expect(serialized).not.toContain('"link"');
    expect(serialized).not.toContain('"image"');
    expect(validatePostBody(draft.body)).toBe(true);
    // El texto se guarda como texto: el renderer nunca lo interpreta como HTML.
    expect(draft.body!.content![0]!.content!.every((node) => node.type === "text")).toBe(true);
  });

  it("does not treat snake_case words or a lone asterisk as italic", () => {
    const body = parsePostMarkdown("El peso_pluma 5 * 3", []).body!;
    expect(body.content).toEqual([paragraph(text("El peso_pluma 5 * 3"))]);
  });

  it("always produces a body that passes the server validation", () => {
    const sample = "TÍTULO: X\nBAJADA: Y\n\n## A\n\nTexto **b** *c* [d](https://e.com)\n\n- f\n- g\n\n> h\n\n---\n\n[FOTO 1]\n\nhttps://youtu.be/dQw4w9WgXcQ";
    expect(validatePostBody(parsePostMarkdown(sample, [PHOTO_1]).body)).toBe(true);
  });

  it("returns no body and an error when the text is beyond the size limits", () => {
    const draft = parsePostMarkdown("palabra ".repeat(8000), []);
    expect(draft.body).toBeNull();
    expect(draft.error).toMatch(/demasiado largo/);
  });
});

describe("postToMarkdown", () => {
  const body: PostBody = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [text("Previa")] },
      paragraph(text("Ganó "), text("por KO", [{ type: "bold" }]), text(" en el "), text("primer round", [{ type: "italic" }, { type: "link", attrs: { href: "https://example.com/r1" } }]), text(".")),
      { type: "heading", attrs: { level: 3 }, content: [text("Detalle")] },
      { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("uno"))] }] },
      { type: "orderedList", content: [{ type: "listItem", content: [paragraph(text("primero"))] }] },
      { type: "blockquote", content: [paragraph(text("Cita uno.")), paragraph(text("Cita dos."))] },
      { type: "horizontalRule" },
      { type: "image", attrs: { mediaId: PHOTO_2 } },
      { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } },
    ],
  };

  it("writes the title, the excerpt and every block in the format the AI is asked to use", () => {
    expect(postToMarkdown({ title: "Título", excerpt: "Bajada", body }, [PHOTO_1, PHOTO_2])).toBe(
      [
        "TÍTULO: Título",
        "BAJADA: Bajada",
        "",
        "## Previa",
        "",
        "Ganó **por KO** en el [*primer round*](https://example.com/r1).",
        "",
        "### Detalle",
        "",
        "- uno",
        "",
        "1. primero",
        "",
        "> Cita uno.",
        ">",
        "> Cita dos.",
        "",
        "---",
        "",
        "[FOTO 2]",
        "",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "",
      ].join("\n"),
    );
  });

  it("reads back to the same body (so the AI can be asked for changes over and over)", () => {
    const markdown = postToMarkdown({ title: "Título", excerpt: "Bajada", body }, [PHOTO_1, PHOTO_2]);
    const draft = parsePostMarkdown(markdown, [PHOTO_1, PHOTO_2]);
    expect(draft.title).toBe("Título");
    expect(draft.excerpt).toBe("Bajada");
    expect(draft.body).toEqual(body);
  });

  it("leaves out the empty title and excerpt and an empty trailing paragraph", () => {
    expect(postToMarkdown({ title: "", excerpt: "", body: { type: "doc", content: [paragraph(text("Hola")), { type: "paragraph" }] } }, [])).toBe("Hola\n");
  });
});

describe("looksLikeAiDraft", () => {
  it("recognizes an answer in the AI format, even after a short chat line", () => {
    expect(looksLikeAiDraft("TÍTULO: Uno\nBAJADA: Dos\n\nTexto.")).toBe(true);
    expect(looksLikeAiDraft("Aquí va:\n\n**Título:** Uno\n\nTexto.")).toBe(true);
  });

  it("does not mistake ordinary text for an AI answer", () => {
    expect(looksLikeAiDraft("Un párrafo cualquiera.")).toBe(false);
    expect(looksLikeAiDraft("El título se definió anoche: Cevallos ganó.")).toBe(false);
    expect(looksLikeAiDraft("")).toBe(false);
  });
});
