// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaDTO } from "@/features/media/dto";
import { PostBody } from "./post-body";

afterEach(cleanup);

const MEDIA_ID = "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11";
const media: Record<string, MediaDTO> = {
  [MEDIA_ID]: {
    id: MEDIA_ID,
    kind: "gallery",
    width: 1600,
    height: 900,
    focal: { x: 0.5, y: 0.5 },
    alt: "Cevallos entrenando",
    variants: [
      { width: 800, height: 450, url: "/media/v/800.webp" },
      { width: 1200, height: 675, url: "/media/v/1200.webp" },
    ],
    originalUrl: "/media/o.png",
  },
};

const text = (value: string, marks?: { type: string; attrs?: Record<string, unknown> }[]) => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const paragraph = (...content: unknown[]) => ({ type: "paragraph", content });
const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("PostBody", () => {
  it("shows a YouTube video as its still with a play button, and plays it in place (no-cookie) after the tap", () => {
    const { container } = render(<PostBody doc={doc({ type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } })} media={{}} />);

    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Reproducir video de YouTube" }));

    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame!.getAttribute("src")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1");
    expect(frame!.getAttribute("allow")).toContain("autoplay");
    expect(frame!.getAttribute("title")).toBeTruthy();
  });

  it("shows a Facebook video behind a facade and loads Facebook's own player after the tap", () => {
    const { container } = render(<PostBody doc={doc({ type: "embed", attrs: { provider: "facebook", id: "watch/1234567890123" } })} media={{}} />);
    expect(container.querySelector("iframe, img")).toBeNull();
    expect(screen.getByRole("link").getAttribute("href")).toBe("https://www.facebook.com/watch/?v=1234567890123");
    fireEvent.click(screen.getByRole("button", { name: /Ver en Facebook/ }));
    expect(container.querySelector("iframe")?.getAttribute("src")).toMatch(/^https:\/\/www\.facebook\.com\/plugins\/video\.php\?href=/);
  });

  it("keeps a link to the original post next to each facade, and loads nothing from the network before the click", () => {
    const { container } = render(
      <PostBody
        doc={doc({ type: "embed", attrs: { provider: "instagram", id: "C8abc123" } }, { type: "embed", attrs: { provider: "tiktok", id: "7412345678901234567" } })}
        media={{}}
      />,
    );
    expect(container.querySelector("iframe, script, img")).toBeNull();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["https://www.instagram.com/p/C8abc123/", "https://www.tiktok.com/@/video/7412345678901234567"]);
    for (const link of links) expect(link.getAttribute("rel")).toBe("noopener noreferrer nofollow");
    fireEvent.click(screen.getByRole("button", { name: /Ver en Instagram/ }));
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe("https://www.instagram.com/p/C8abc123/embed");
  });

  it("opens external links in a new tab without leaking the opener or passing authority", () => {
    render(<PostBody doc={doc(paragraph(text("el sitio", [{ type: "link", attrs: { href: "https://example.com/nota" } }])))} media={{}} />);
    const link = screen.getByRole("link", { name: "el sitio" });
    expect(link.getAttribute("href")).toBe("https://example.com/nota");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer nofollow");
  });

  it("keeps links inside the site in the same tab", () => {
    render(<PostBody doc={doc(paragraph(text("eventos", [{ type: "link", attrs: { href: "/eventos" } }])))} media={{}} />);
    const link = screen.getByRole("link", { name: "eventos" });
    expect(link.getAttribute("href")).toBe("/eventos");
    expect(link.getAttribute("target")).toBeNull();
  });

  it("shows only the text of a link that is not safe", () => {
    render(<PostBody doc={doc(paragraph(text("clic aquí", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])))} media={{}} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("clic aquí")).toBeTruthy();
  });

  it("does not render nodes it does not know, nor their content", () => {
    const { container } = render(
      <PostBody
        doc={doc(
          { type: "codeBlock", content: [text("alert(1)")] },
          { type: "html", attrs: { html: "<script>alert(1)</script>" } },
          { type: "mystery", content: [paragraph(text("escondido"))] },
          paragraph(text("visible")),
        )}
        media={{}}
      />,
    );
    expect(container.textContent).toBe("visible");
    expect(container.querySelector("script, pre")).toBeNull();
  });

  it("renders headings 2 and 3, lists, quotes, separators and the bold and italic marks", () => {
    const { container } = render(
      <PostBody
        doc={doc(
          { type: "heading", attrs: { level: 2 }, content: [text("Título")] },
          { type: "heading", attrs: { level: 3 }, content: [text("Subtítulo")] },
          paragraph(text("negrita", [{ type: "bold" }]), text(" y "), text("cursiva", [{ type: "italic" }])),
          { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("uno"))] }] },
          { type: "orderedList", content: [{ type: "listItem", content: [paragraph(text("dos"))] }] },
          { type: "blockquote", content: [paragraph(text("una cita"))] },
          { type: "horizontalRule" },
        )}
        media={{}}
      />,
    );
    expect(container.querySelector("h2")?.textContent).toBe("Título");
    expect(container.querySelector("h3")?.textContent).toBe("Subtítulo");
    expect(container.querySelector("strong")?.textContent).toBe("negrita");
    expect(container.querySelector("em")?.textContent).toBe("cursiva");
    expect(container.querySelector("ul li")?.textContent).toBe("uno");
    expect(container.querySelector("ol li")?.textContent).toBe("dos");
    expect(container.querySelector("blockquote")?.textContent).toBe("una cita");
    expect(container.querySelector("hr")).not.toBeNull();
    expect(container.querySelector("h1")).toBeNull();
  });

  it("never turns a heading level it does not allow into a bigger heading", () => {
    const { container } = render(<PostBody doc={doc({ type: "heading", attrs: { level: 1 }, content: [text("Gigante")] })} media={{}} />);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renders an image with its responsive variants and alt text, and omits one that no longer exists", () => {
    const missing = "9a1c2d3e-4f50-4a6b-8c7d-0e1f2a3b4c5d";
    const { container } = render(<PostBody doc={doc({ type: "image", attrs: { mediaId: MEDIA_ID } }, { type: "image", attrs: { mediaId: missing } })} media={media} />);
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0]!.getAttribute("alt")).toBe("Cevallos entrenando");
    expect(images[0]!.getAttribute("srcset")).toContain("/media/v/800.webp 800w");
    expect(images[0]!.getAttribute("sizes")).toBeTruthy();
  });

  it("renders nothing for a body that is not a document", () => {
    const { container } = render(<PostBody doc={"<p>hola</p>"} media={{}} />);
    expect(container.textContent).toBe("");
  });
});

describe("PostBody alignment", () => {
  it("justifies paragraphs and headings by default and keeps the alignment chosen for each one", () => {
    render(
      <PostBody
        doc={doc(
          paragraph(text("Por defecto")),
          { type: "paragraph", attrs: { textAlign: "center" }, content: [text("Centrado")] },
          { type: "heading", attrs: { level: 2, textAlign: "right" }, content: [text("A la derecha")] },
          { type: "heading", attrs: { level: 3 }, content: [text("Subtítulo")] },
        )}
        media={{}}
      />,
    );
    expect(screen.getByText("Por defecto").closest("p")?.dataset.align).toBe("justify");
    expect(screen.getByText("Centrado").closest("p")?.dataset.align).toBe("center");
    expect(screen.getByText("A la derecha").closest("h2")?.dataset.align).toBe("right");
    expect(screen.getByText("Subtítulo").closest("h3")?.dataset.align).toBe("justify");
  });
});
