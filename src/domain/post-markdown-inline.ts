import { isSafeHref, withProtocol, type PostMark, type PostNode } from "./post-body";

// Formato dentro de una línea: **negrita**, *cursiva* (o _cursiva_), [texto](enlace) y direcciones sueltas. Todo lo
// demás (HTML incluido) queda como texto: el renderer nunca interpreta texto como HTML.

const MARK_ORDER: Record<string, number> = { bold: 0, italic: 1, link: 2 };

// En orden de prioridad: con dos coincidencias en la misma posición gana la primera alternativa.
const INLINE_PATTERN = new RegExp(
  [
    String.raw`\[([^\]]+)\]\(([^)\s]+)\)`, // 1-2: [texto](enlace)
    String.raw`(https?:\/\/[^\s<>()\[\]]+)`, // 3: dirección suelta
    String.raw`\*\*((?:[^*]|\*[^*\s][^*]*\*)+)\*\*`, // 4: **negrita** (puede llevar *cursiva* adentro)
    String.raw`__([^_]+)__`, // 5: __negrita__
    String.raw`\*([^*\s](?:[^*]*[^*\s])?)\*`, // 6: *cursiva*
    String.raw`(?<![\p{L}\p{N}_])_([^_\s](?:[^_]*[^_\s])?)_(?![\p{L}\p{N}_])`, // 7: _cursiva_ (no dentro de palabra_con_guion)
  ].join("|"),
  "gu",
);

const TRAILING_PUNCTUATION = /[.,;:!?»"')\]]+$/;

function textNode(text: string, marks: PostMark[]): PostNode | null {
  if (!text) return null;
  if (marks.length === 0) return { type: "text", text };
  const sorted = [...marks].sort((a, b) => (MARK_ORDER[a.type] ?? 9) - (MARK_ORDER[b.type] ?? 9));
  return { type: "text", text, marks: sorted };
}

const linkMark = (href: string): PostMark => ({ type: "link", attrs: { href } });

/** Texto de una línea a nodos de texto con marcas. */
export function parseInline(source: string, marks: PostMark[] = []): PostNode[] {
  const nodes: (PostNode | null)[] = [];
  let position = 0;
  for (const match of source.matchAll(INLINE_PATTERN)) {
    const index = match.index;
    nodes.push(textNode(source.slice(position, index), marks));
    position = index + match[0].length;

    const [, linkText, linkHref, bareUrl, bold, boldUnderscore, italic, italicUnderscore] = match;
    if (linkText !== undefined && linkHref !== undefined) {
      const href = withProtocol(linkHref);
      nodes.push(...(isSafeHref(href) ? parseInline(linkText, [...marks, linkMark(href)]) : parseInline(linkText, marks)));
    } else if (bareUrl !== undefined) {
      const trailing = bareUrl.match(TRAILING_PUNCTUATION)?.[0] ?? "";
      const url = bareUrl.slice(0, bareUrl.length - trailing.length);
      nodes.push(isSafeHref(url) ? textNode(url, [...marks, linkMark(url)]) : textNode(url, marks));
      position -= trailing.length;
    } else if (bold !== undefined || boldUnderscore !== undefined) {
      nodes.push(...parseInline((bold ?? boldUnderscore)!, [...marks, { type: "bold" }]));
    } else {
      nodes.push(...parseInline((italic ?? italicUnderscore)!, [...marks, { type: "italic" }]));
    }
  }
  nodes.push(textNode(source.slice(position), marks));
  return nodes.filter((node): node is PostNode => node !== null);
}

/** Nodos de texto a una línea con el mismo formato (los espacios de los bordes quedan fuera de las marcas). */
export function formatInline(nodes: PostNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === "hardBreak") return " ";
      if (node.type !== "text" || !node.text) return "";
      const [, before, core, after] = node.text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
      if (!core) return node.text;
      const types = new Set((node.marks ?? []).map((mark) => mark.type));
      let output = core;
      if (types.has("italic")) output = `*${output}*`;
      if (types.has("bold")) output = `**${output}**`;
      const href = node.marks?.find((mark) => mark.type === "link")?.attrs?.href;
      if (typeof href === "string") output = `[${output}](${href})`;
      return `${before}${output}${after}`;
    })
    .join("");
}
