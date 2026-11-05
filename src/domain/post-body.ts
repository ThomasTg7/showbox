import { embedFromAttrs } from "./embed";

// Cuerpo de una noticia: JSON de Tiptap restringido a los nodos que el sitio sabe mostrar (spec §4.8). Esta lista es
// la única fuente: el editor solo ofrece estos nodos, la action rechaza lo demás y el renderer ignora lo desconocido.

export type PostMark = { type: string; attrs?: Record<string, unknown> };
export type PostNode = { type: string; attrs?: Record<string, unknown>; content?: PostNode[]; text?: string; marks?: PostMark[] };
export type PostBody = { type: "doc"; content?: PostNode[] };

export const EMPTY_POST_BODY: PostBody = { type: "doc", content: [{ type: "paragraph" }] };

const MAX_DEPTH = 12;
const MAX_NODES = 5000;
const MAX_TEXT_LENGTH = 50_000;
const MAX_HREF_LENGTH = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INLINE = new Set(["text", "hardBreak"]);
const LISTS = new Set(["bulletList", "orderedList"]);
const BLOCKS = new Set(["paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "image", "embed"]);
const MARKS = new Set(["bold", "italic", "link"]);
/** Nodos que apuntan a imágenes o redes: los textos de Configuración (Nosotros, Privacidad) no los llevan. */
const MEDIA_NODES = new Set(["image", "embed"]);

/** Qué nodos pueden ir dentro de cada nodo; los que no figuran no llevan contenido. */
const CHILDREN: Record<string, ReadonlySet<string>> = {
  doc: BLOCKS,
  paragraph: INLINE,
  heading: INLINE,
  bulletList: new Set(["listItem"]),
  orderedList: new Set(["listItem"]),
  listItem: new Set(["paragraph", ...LISTS]),
  blockquote: BLOCKS,
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Alineaciones de párrafos y títulos. Sin alineación guardada, el texto va justificado. */
export const TEXT_ALIGNS = ["justify", "left", "center", "right"] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];
export const DEFAULT_TEXT_ALIGN: TextAlign = "justify";

const isTextAlign = (value: unknown): value is TextAlign => (TEXT_ALIGNS as readonly unknown[]).includes(value);
const hasValidAlign = (attrs: unknown) => !isRecord(attrs) || attrs.textAlign === undefined || attrs.textAlign === null || isTextAlign(attrs.textAlign);

/** La alineación con que se dibuja un párrafo o título (justificado si no tiene una válida). */
export function textAlignOf(node: PostNode): TextAlign {
  return isTextAlign(node.attrs?.textAlign) ? node.attrs.textAlign : DEFAULT_TEXT_ALIGN;
}

/** Enlaces permitidos: http(s), correo o una ruta del propio sitio. Nunca `javascript:` ni `data:`. */
export function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length === 0 || href.length > MAX_HREF_LENGTH) return false;
  if (href.startsWith("/")) return !href.startsWith("//") && !href.includes("\\");
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

/** «example.com» se completa con https://; las rutas del sitio (`/eventos`) y los esquemas escritos se dejan como están. */
export function withProtocol(href: string): string {
  return /^([a-z][a-z0-9+.-]*:|\/)/i.test(href) ? href : `https://${href}`;
}

function isValidMarks(marks: unknown): boolean {
  if (marks === undefined) return true;
  if (!Array.isArray(marks)) return false;
  return marks.every((mark) => isRecord(mark) && typeof mark.type === "string" && MARKS.has(mark.type) && (mark.type !== "link" || (isRecord(mark.attrs) && isSafeHref(mark.attrs.href))));
}

function isValidAttrs(node: Record<string, unknown>): boolean {
  switch (node.type) {
    case "heading":
      return isRecord(node.attrs) && (node.attrs.level === 2 || node.attrs.level === 3) && hasValidAlign(node.attrs);
    case "paragraph":
      return hasValidAlign(node.attrs);
    case "image":
      return isRecord(node.attrs) && typeof node.attrs.mediaId === "string" && UUID.test(node.attrs.mediaId);
    case "embed":
      return embedFromAttrs(node.attrs) !== null;
    default:
      return true;
  }
}

type Walk = { nodes: number; allowMedia: boolean };

function isValidNode(node: unknown, allowed: ReadonlySet<string>, depth: number, walk: Walk): boolean {
  if (depth > MAX_DEPTH || !isRecord(node) || typeof node.type !== "string" || !allowed.has(node.type)) return false;
  if (!walk.allowMedia && MEDIA_NODES.has(node.type)) return false;
  walk.nodes += 1;
  if (walk.nodes > MAX_NODES) return false;

  if (node.type === "text") {
    return typeof node.text === "string" && node.text.length > 0 && node.text.length <= MAX_TEXT_LENGTH && isValidMarks(node.marks);
  }
  if (!isValidAttrs(node)) return false;

  const childTypes = CHILDREN[node.type];
  if (node.content === undefined) return true;
  if (!childTypes || !Array.isArray(node.content)) return false;
  return node.content.every((child) => isValidNode(child, childTypes, depth + 1, walk));
}

/**
 * `true` solo si el JSON es un documento hecho únicamente de los nodos, marcas y atributos permitidos. Con
 * `allowMedia: false` (textos de Configuración) tampoco se aceptan imágenes ni publicaciones de redes.
 */
export function validatePostBody(body: unknown, { allowMedia = true }: { allowMedia?: boolean } = {}): body is PostBody {
  if (!isRecord(body) || body.type !== "doc") return false;
  if (body.content === undefined) return true;
  if (!Array.isArray(body.content)) return false;
  const walk: Walk = { nodes: 0, allowMedia };
  return body.content.every((child) => isValidNode(child, BLOCKS, 1, walk));
}

/** Ids de las imágenes que aparecen dentro del cuerpo, sin repetir y en el orden en que salen. */
export function collectBodyMediaIds(body: unknown): string[] {
  const ids = new Set<string>();
  const visit = (node: unknown, depth: number) => {
    if (depth > MAX_DEPTH + 1 || !isRecord(node)) return;
    if (node.type === "image" && isRecord(node.attrs) && typeof node.attrs.mediaId === "string") ids.add(node.attrs.mediaId);
    if (Array.isArray(node.content)) for (const child of node.content) visit(child, depth + 1);
  };
  visit(body, 0);
  return [...ids];
}

/**
 * `true` si el cuerpo dice algo: texto que no sea solo espacios, una imagen o una publicación. Una página de Configuración
 * con el cuerpo vacío no se dibuja (se muestra un aviso en vez de un bloque en blanco).
 */
export function hasPostBodyContent(body: unknown): boolean {
  const visit = (node: unknown, depth: number): boolean => {
    if (depth > MAX_DEPTH + 1 || !isRecord(node)) return false;
    if (node.type === "image" || node.type === "embed") return true;
    if (node.type === "text" && typeof node.text === "string" && node.text.trim() !== "") return true;
    return Array.isArray(node.content) && node.content.some((child) => visit(child, depth + 1));
  };
  return visit(body, 0);
}

/** `true` si el cuerpo trae alguna publicación de una red o video (nodo `embed`): lo que mete una noticia en «No te lo pierdas». */
export function bodyHasEmbed(body: unknown): boolean {
  const visit = (node: unknown, depth: number): boolean => {
    if (depth > MAX_DEPTH + 1 || !isRecord(node)) return false;
    if (node.type === "embed") return true;
    return Array.isArray(node.content) && node.content.some((child) => visit(child, depth + 1));
  };
  return visit(body, 0);
}
