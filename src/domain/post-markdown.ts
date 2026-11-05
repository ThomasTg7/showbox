import { embedCanonicalUrl, embedFromAttrs, parseEmbedUrl } from "./embed";
import { EMPTY_POST_BODY, isSafeHref, validatePostBody, withProtocol, type PostBody, type PostNode } from "./post-body";
import { readDraftHeader, RULE, stripCodeFence } from "./post-markdown-header";
import { formatInline, parseInline } from "./post-markdown-inline";

export { looksLikeAiDraft } from "./post-markdown-header";

// Texto que entrega una IA (Markdown simple) ⇄ cuerpo de una noticia. El formato es el que pide el prompt del panel:
// TÍTULO/BAJADA arriba, ## y ### para títulos, listas, citas, ---, [FOTO N] y el link de una red solo en su línea (o
// dentro de una frase: la publicación va debajo del párrafo).
// El resultado pasa por `validatePostBody`, igual que lo que se guarda desde el editor.

export const TITLE_MAX = 140;
export const EXCERPT_MAX = 300;

export type PostDraft = {
  title: string | null;
  excerpt: string | null;
  /** `null` si el texto no cabe en una noticia (ver `error`). */
  body: PostBody | null;
  /** Avisos que no impiden cargar el texto (una foto que no existe, un título largo). */
  warnings: string[];
  error?: string;
};

const HEADING = /^(#{1,6})\s+(.*)$/;
const PHOTO = /^\[foto\s*(\d+)\]$/i;
const BULLET = /^[-*+•]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const LONE_URL = /^<?((?:https?:\/\/|www\.)\S+?)>?$/i;
const LONE_LINK = /^\[[^\]]+\]\(([^)\s]+)\)$/;

/** Un link solo en su línea: publicación de una red si se reconoce; si no, un párrafo con el enlace. */
function loneLinkBlock(line: string): PostNode | null {
  const href = line.match(LONE_LINK)?.[1] ?? line.match(LONE_URL)?.[1];
  if (!href) return null;
  const embed = parseEmbedUrl(href);
  if (embed) return { type: "embed", attrs: { provider: embed.provider, id: embed.id } };
  if (!LONE_URL.test(line)) return null;
  const url = withProtocol(href);
  return isSafeHref(url) ? { type: "paragraph", content: [{ type: "text", text: href, marks: [{ type: "link", attrs: { href: url } }] }] } : null;
}

const paragraphOf = (text: string): PostNode => {
  const content = parseInline(text);
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
};

/** Las publicaciones de redes enlazadas dentro de un párrafo (sin repetir): se muestran justo debajo de él. */
function embedsLinkedIn(node: PostNode): PostNode[] {
  const embeds = new Map<string, PostNode>();
  for (const child of node.content ?? []) {
    const href = child.marks?.find((mark) => mark.type === "link")?.attrs?.href;
    const embed = typeof href === "string" ? parseEmbedUrl(href) : null;
    if (embed) embeds.set(`${embed.provider}:${embed.id}`, { type: "embed", attrs: { provider: embed.provider, id: embed.id } });
  }
  return [...embeds.values()];
}

function parseBlocks(lines: string[], photoIds: readonly string[], warnings: string[]): PostNode[] {
  const blocks: PostNode[] = [];
  let paragraph: string[] = [];
  let quote: string[] | null = null;
  // Se reasigna dentro de `push`: sin el `as`, TypeScript lo da por `null` para siempre.
  let list = null as PostNode | null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      const node = paragraphOf(paragraph.join(" "));
      blocks.push(node, ...embedsLinkedIn(node));
    }
    paragraph = [];
  };
  const flushQuote = () => {
    if (!quote) return;
    const paragraphs = quote.join("\n").split(/\n\s*\n/).map((part) => part.split("\n").map((line) => line.trim()).filter(Boolean).join(" ")).filter(Boolean);
    if (paragraphs.length > 0) blocks.push({ type: "blockquote", content: paragraphs.map(paragraphOf) });
    quote = null;
  };
  const push = (block: PostNode) => {
    flushParagraph();
    flushQuote();
    list = null;
    blocks.push(block);
  };

  for (const raw of lines) {
    const line = raw.trim();
    const quoted = line.match(QUOTE);
    if (quoted) {
      flushParagraph();
      list = null;
      (quote ??= []).push(quoted[1]!);
      continue;
    }
    flushQuote();
    if (!line) {
      flushParagraph();
      continue;
    }

    const item = line.match(BULLET) ?? line.match(ORDERED);
    if (item && !RULE.test(line)) {
      flushParagraph();
      const content = parseInline(item[1]!.trim());
      if (content.length === 0) continue;
      const type = BULLET.test(line) ? "bulletList" : "orderedList";
      // Una línea en blanco entre ítems no corta la lista (las IA suelen dejarla).
      if (list?.type !== type) {
        list = { type, content: [] };
        blocks.push(list);
      }
      list.content!.push({ type: "listItem", content: [{ type: "paragraph", content }] });
      continue;
    }

    const heading = line.match(HEADING);
    const photo = line.match(PHOTO);
    const lone = loneLinkBlock(line);
    if (heading) {
      const content = parseInline(heading[2]!.trim());
      if (content.length > 0) push({ type: "heading", attrs: { level: heading[1]!.length <= 2 ? 2 : 3 }, content });
    } else if (RULE.test(line)) {
      push({ type: "horizontalRule" });
    } else if (photo) {
      const number = Number(photo[1]);
      const mediaId = photoIds[number - 1];
      if (mediaId) push({ type: "image", attrs: { mediaId } });
      else warnings.push(`[FOTO ${number}] no se insertó: ${photoIds.length === 0 ? "no hay fotos subidas" : `solo hay ${photoIds.length} ${photoIds.length === 1 ? "foto subida" : "fotos subidas"}`}.`);
    } else if (lone) {
      push(lone);
    } else {
      list = null;
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushQuote();
  return blocks;
}

/** Texto de la IA a título, bajada y cuerpo. `photoIds[0]` es la «[FOTO 1]». */
export function parsePostMarkdown(text: string, photoIds: readonly string[]): PostDraft {
  const lines = stripCodeFence(text.replace(/\r\n?/g, "\n").split("\n"));
  const { title, excerpt, start } = readDraftHeader(lines);
  const warnings: string[] = [];
  if (title && title.length > TITLE_MAX) warnings.push(`El título tiene ${title.length} caracteres (máximo ${TITLE_MAX}).`);
  if (excerpt && excerpt.length > EXCERPT_MAX) warnings.push(`La bajada tiene ${excerpt.length} caracteres (máximo ${EXCERPT_MAX}).`);

  const content = parseBlocks(lines.slice(start), photoIds, warnings);
  const body: PostBody = content.length > 0 ? { type: "doc", content } : structuredClone(EMPTY_POST_BODY);
  if (!validatePostBody(body)) return { title, excerpt, body: null, warnings, error: "El texto es demasiado largo para una noticia. Pídele a la IA una versión más corta." };
  return { title, excerpt, body, warnings };
}

function formatBlock(node: PostNode, photoIds: readonly string[], indent = ""): string | null {
  switch (node.type) {
    case "paragraph":
      return node.content?.length ? formatInline(node.content) : null;
    case "heading":
      return `${node.attrs?.level === 3 ? "###" : "##"} ${formatInline(node.content)}`;
    case "bulletList":
    case "orderedList":
      return (node.content ?? [])
        .map((item, index) => {
          const marker = node.type === "bulletList" ? "-" : `${index + 1}.`;
          const [first, ...rest] = item.content ?? [];
          const nested = rest.map((child) => formatBlock(child, photoIds, `${indent}  `)).filter(Boolean);
          return [`${indent}${marker} ${first ? formatInline(first.content) : ""}`, ...nested].join("\n");
        })
        .join("\n");
    case "blockquote":
      return (node.content ?? []).map((child) => `> ${formatInline(child.content)}`).join("\n>\n");
    case "horizontalRule":
      return "---";
    case "image": {
      const number = photoIds.indexOf(String(node.attrs?.mediaId)) + 1;
      return number > 0 ? `[FOTO ${number}]` : null;
    }
    case "embed": {
      const embed = embedFromAttrs(node.attrs);
      return embed ? embedCanonicalUrl(embed) : null;
    }
    default:
      return null;
  }
}

/** La noticia actual en el mismo formato, para pedirle cambios a la IA. Las imágenes salen como «[FOTO N]». */
export function postToMarkdown(post: { title: string; excerpt: string; body: PostBody }, photoIds: readonly string[]): string {
  const header = [post.title.trim() && `TÍTULO: ${post.title.trim()}`, post.excerpt.trim() && `BAJADA: ${post.excerpt.trim()}`].filter(Boolean);
  const blocks = (post.body.content ?? []).map((node) => formatBlock(node, photoIds)).filter((block): block is string => Boolean(block));
  const sections = [...(header.length > 0 ? [header.join("\n")] : []), ...blocks];
  return sections.length > 0 ? `${sections.join("\n\n")}\n` : "";
}
