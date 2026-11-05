// @vitest-environment jsdom
import { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it } from "vitest";
import { validatePostBody, type PostBody } from "@/domain/post-body";
import { createPostExtensions } from "./extensions";

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

function editorWith(content: string | object): Editor {
  editor = new Editor({ extensions: createPostExtensions(() => undefined), content });
  return editor;
}

const WORD_HTML = `
  <p class="MsoNormal" style="margin:0cm;font-family:Calibri;color:red"><span style="mso-bidi-font-size:11pt">Hola <b style="mso-bidi-font-weight:normal">negrita</b>
  <i>cursiva</i> <u>subrayado</u> <s>tachado</s> <code>x=1</code></span></p>
  <h1 style="font-size:40px">Gran título</h1>
  <h2>Subtítulo permitido</h2>
  <h4>Muy chico</h4>
  <pre><code>alert(1)</code></pre>
  <table><tbody><tr><td>celda</td></tr></tbody></table>
  <img src="https://example.com/x.png" alt="de otro sitio">
  <iframe src="https://evil.example"></iframe>
  <script>alert(1)</script>
  <p><a href="javascript:alert(1)">enlace malo</a> y <a href="https://example.com/ok" style="color:blue" class="x">enlace bueno</a></p>
`;

describe("what the editor keeps when text is pasted from Word or the web", () => {
  it("produces a body that passes the same validation the server runs", () => {
    const json = editorWith(WORD_HTML).getJSON();
    expect(validatePostBody(json)).toBe(true);
  });

  it("drops styles, classes, underline, strikethrough, code, tables, foreign images, frames and scripts", () => {
    const serialized = JSON.stringify(editorWith(WORD_HTML).getJSON());
    for (const forbidden of ["style", "class", "underline", "strike", "code", "table", "image", "iframe", "script", "javascript", "mso", "Calibri"]) {
      expect(serialized, forbidden).not.toContain(forbidden);
    }
  });

  it("keeps the text, the bold and italic, the allowed headings and a safe link", () => {
    const serialized = JSON.stringify(editorWith(WORD_HTML).getJSON());
    expect(serialized).toContain("negrita");
    expect(serialized).toContain('"type":"bold"');
    expect(serialized).toContain('"type":"italic"');
    expect(serialized).toContain("Subtítulo permitido");
    expect(serialized).toContain('"href":"https://example.com/ok"');
    expect(serialized).not.toContain('"level":1');
    expect(serialized).not.toContain('"level":4');
  });

  it("does not turn a pasted heading 1 into a bigger heading than the site allows", () => {
    const { content } = editorWith("<h1>Gran título</h1>").getJSON();
    expect(JSON.stringify(content)).toContain("Gran título");
    expect(JSON.stringify(content)).not.toContain('"type":"heading"');
  });
});

describe("pasting a link from a network on its own", () => {
  function paste(instance: Editor, text: string): boolean {
    const event = { clipboardData: { getData: (type: string) => (type === "text/plain" ? text : "") } } as unknown as ClipboardEvent;
    return instance.view.someProp("handlePaste", (handler) => handler(instance.view, event, null as never)) === true;
  }

  const types = (instance: Editor) => (instance.getJSON() as PostBody).content?.map((node) => node.type);

  it("turns a YouTube link pasted in an empty paragraph into an embed", () => {
    const instance = editorWith({ type: "doc", content: [{ type: "paragraph" }] });
    instance.commands.focus("start");
    expect(paste(instance, "https://youtu.be/dQw4w9WgXcQ?t=10")).toBe(true);
    const embed = (instance.getJSON() as PostBody).content?.find((node) => node.type === "embed");
    expect(embed?.attrs).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    // El párrafo vacío se reemplazó por la publicación; el editor deja un párrafo final para seguir escribiendo.
    expect(types(instance)).toEqual(["embed", "paragraph"]);
  });

  it("inside a sentence, keeps the link in the text and puts the video right after the paragraph", () => {
    const withText = editorWith({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Mira esto " }] },
        { type: "paragraph", content: [{ type: "text", text: "Después" }] },
      ],
    });
    withText.commands.setTextSelection(11);
    expect(paste(withText, "https://www.facebook.com/watch/?v=1234567890123")).toBe(true);
    const content = (withText.getJSON() as PostBody).content!;
    expect(content.map((node) => node.type)).toEqual(["paragraph", "embed", "paragraph"]);
    expect(content[0]!.content?.at(-1)).toEqual({
      type: "text",
      text: "https://www.facebook.com/watch/?v=1234567890123",
      marks: [{ type: "link", attrs: { href: "https://www.facebook.com/watch/?v=1234567890123" } }],
    });
    expect(content[1]!.attrs).toEqual({ provider: "facebook", id: "watch/1234567890123" });
    expect(validatePostBody(withText.getJSON())).toBe(true);
  });

  it("leaves the paste alone for other links and for longer text", () => {
    const empty = editorWith({ type: "doc", content: [{ type: "paragraph" }] });
    empty.commands.focus("start");
    expect(paste(empty, "https://example.com/nota")).toBe(false);
    expect(paste(empty, "mira https://youtu.be/dQw4w9WgXcQ")).toBe(false);
    expect(types(empty)).toEqual(["paragraph"]);
  });
});

describe("how an embed looks inside the editor", () => {
  function editorWithEmbed(provider: string, id: string): Editor {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: createPostExtensions(() => undefined),
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Antes" }] }, { type: "embed", attrs: { provider, id } }] },
    });
    return editor;
  }

  it("shows the real YouTube player (no-cookie domain, sandboxed) so the admin sees what was pasted", () => {
    const frame = editorWithEmbed("youtube", "dQw4w9WgXcQ").view.dom.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(frame?.getAttribute("sandbox")).toContain("allow-scripts");
    expect(frame?.getAttribute("sandbox")).not.toContain("allow-top-navigation");
    expect(frame?.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
  });

  it("shows the Instagram post itself, also for a reel", () => {
    const frame = editorWithEmbed("instagram", "C9xYz12AbCd").view.dom.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe("https://www.instagram.com/p/C9xYz12AbCd/embed");
  });

  it("has a «Quitar» button that removes only the embed", () => {
    const current = editorWithEmbed("youtube", "dQw4w9WgXcQ");
    const remove = [...current.view.dom.querySelectorAll("button")].find((button) => button.textContent?.includes("Quitar"));
    remove?.click();
    expect(JSON.stringify(current.getJSON())).not.toContain('"embed"');
    expect(JSON.stringify(current.getJSON())).toContain("Antes");
  });

  it("does not create any frame for invalid attributes", () => {
    expect(editorWithEmbed("youtube", "../../evil").view.dom.querySelector("iframe")).toBeNull();
  });
});

describe("createPostExtensions without media (Configuración)", () => {
  const MEDIA_ID = "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11";

  it("has no image, embed or paste-embed extension", () => {
    const names = createPostExtensions(() => undefined, { media: false }).map((extension) => extension.name);
    expect(names).not.toEqual(expect.arrayContaining(["image"]));
    expect(names).not.toEqual(expect.arrayContaining(["embed"]));
    expect(names).not.toEqual(expect.arrayContaining(["pasteEmbed"]));
  });

  it("does not turn pasted image or embed markup into nodes", () => {
    editor = new Editor({ extensions: createPostExtensions(() => undefined, { media: false }), content: "" });
    editor.commands.insertContent(`<p>Hola</p><figure data-media-id="${MEDIA_ID}"></figure><div data-embed-provider="youtube" data-embed-id="dQw4w9WgXcQ"></div>`);
    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain("Hola");
    expect(json).not.toContain('"image"');
    expect(json).not.toContain('"embed"');
  });

  it("keeps both by default", () => {
    const names = createPostExtensions(() => undefined).map((extension) => extension.name);
    expect(names).toEqual(expect.arrayContaining(["image", "embed", "pasteEmbed"]));
  });
});

describe("text alignment in the editor", () => {
  const twoParagraphs = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Primero" }] }, { type: "paragraph", content: [{ type: "text", text: "Segundo" }] }] };

  it("justifies by default and aligns only the paragraph where the cursor is", () => {
    const current = editorWith(twoParagraphs);
    expect(current.getJSON().content?.map((node) => node.attrs?.textAlign)).toEqual(["justify", "justify"]);

    current.chain().setTextSelection(2).setTextAlign("center").run();
    const body = current.getJSON() as PostBody;
    expect(body.content?.map((node) => node.attrs?.textAlign)).toEqual(["center", "justify"]);
    expect(validatePostBody(body)).toBe(true);
  });

  it("aligns every paragraph inside the selection, and only those", () => {
    const current = editorWith({ ...twoParagraphs, content: [...twoParagraphs.content, { type: "paragraph", content: [{ type: "text", text: "Tercero" }] }] });
    current.chain().setTextSelection({ from: 2, to: 12 }).setTextAlign("right").run();
    expect(current.getJSON().content?.map((node) => node.attrs?.textAlign)).toEqual(["right", "right", "justify"]);
  });

  it("does not offer alignments the site does not allow", () => {
    const current = editorWith(twoParagraphs);
    expect(current.chain().setTextSelection(2).setTextAlign("start").run()).toBe(false);
  });
});
