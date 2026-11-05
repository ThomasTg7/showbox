// El encabezado de la respuesta de una IA (TÍTULO y BAJADA) y la limpieza previa del texto. Lo usa `post-markdown.ts`.

const TITLE_LINE = /^t[ií]tulo\s*:\s*(.*)$/i;
const EXCERPT_LINE = /^bajada\s*:\s*(.*)$/i;
const BODY_LABEL = /^(texto|cuerpo)\s*:?\s*$/i;
/** Separador «---» (también `***` o `___`): tras el encabezado lo separa del cuerpo; en el cuerpo es un separador. */
export const RULE = /^(-{3,}|\*{3,}|_{3,})$/;

/** Una línea de encabezado sin adornos (`**Título:**`, `# Título:`). */
const plainLabel = (line: string) => line.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();

/** Quita un bloque de código (```) que envuelva toda la respuesta. */
export function stripCodeFence(lines: string[]): string[] {
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first < 0 || !lines[first]!.trim().startsWith("```")) return lines;
  const rest = lines.slice(first + 1);
  const last = rest.findLastIndex((line) => line.trim() !== "");
  return last >= 0 && rest[last]!.trim().startsWith("```") ? rest.slice(0, last) : rest;
}

/** Líneas con texto que pueden ir antes de TÍTULO (el «¡Claro! Aquí tienes la noticia:» de la IA); se descartan. */
const PREAMBLE_MAX_LINES = 2;

const isHeaderLabel = (line: string) => TITLE_LINE.test(plainLabel(line)) || EXCERPT_LINE.test(plainLabel(line));

/** Dónde empieza el encabezado: la primera etiqueta, si aparece tras como mucho `PREAMBLE_MAX_LINES` líneas con texto. */
function headerStart(lines: string[]): number | null {
  let seen = 0;
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    if (isHeaderLabel(line)) return index;
    if (++seen > PREAMBLE_MAX_LINES) return null;
  }
  return null;
}

/**
 * Lee TÍTULO y BAJADA del principio; devuelve desde qué línea empieza el cuerpo. Una etiqueta vacía cuenta como
 * encabezado pero vale `null`: cargar el texto nunca borra lo que ya está escrito en el formulario.
 */
export function readDraftHeader(lines: string[]) {
  const first = headerStart(lines);
  if (first === null) return { found: false, title: null, excerpt: null, start: 0 };
  let title: string | undefined;
  let excerpt: string | undefined;
  let index = first;
  for (; index < lines.length; index++) {
    const line = plainLabel(lines[index]!);
    if (!line) continue;
    const titleMatch = line.match(TITLE_LINE);
    const excerptMatch = line.match(EXCERPT_LINE);
    if (titleMatch && title === undefined) title = titleMatch[1]!.trim();
    else if (excerptMatch && excerpt === undefined) excerpt = excerptMatch[1]!.trim();
    else break;
  }
  // Tras el encabezado, una línea «---» o «Texto:» separa el cuerpo: no es parte de él.
  const next = lines.findIndex((line, position) => position >= index && line.trim() !== "");
  if (next >= 0 && (RULE.test(lines[next]!.trim()) || BODY_LABEL.test(plainLabel(lines[next]!)))) index = next + 1;
  return { found: true, title: title || null, excerpt: excerpt || null, start: index };
}

/** Si el texto viene en el formato del prompt (con TÍTULO o BAJADA): al pegarlo en el editor se carga como en «Con IA». */
export function looksLikeAiDraft(text: string): boolean {
  return readDraftHeader(stripCodeFence(text.replace(/\r\n?/g, "\n").split("\n"))).found;
}
