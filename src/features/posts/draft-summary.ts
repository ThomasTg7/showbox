import { embedFromAttrs, isVerticalEmbed, type Embed } from "@/domain/embed";
import type { PostDraft } from "@/domain/post-markdown";
import { EMBED_PROVIDER_NAME } from "./embed-frame";

export type DraftSummaryItem = { ok: boolean; text: string };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** «video de YouTube» / «publicaciones de Instagram»: el nombre de lo que trae cada red, en singular o plural. */
function embedLabel(embed: Embed, count: number): string {
  const noun = isVerticalEmbed(embed) ? plural(count, "publicación", "publicaciones") : plural(count, "video", "videos");
  return `${noun} de ${EMBED_PROVIDER_NAME[embed.provider]}`;
}

/** Lo que se cargará en la noticia, para mostrarlo antes de tocar «Cargar» (paso 3 de «Con IA»). */
export function summarizeDraft(draft: PostDraft): DraftSummaryItem[] {
  if (!draft.body) return [];
  const blocks = draft.body.content ?? [];
  const items: DraftSummaryItem[] = [
    draft.title ? { ok: true, text: `Título: «${draft.title}»` } : { ok: false, text: "No trae TÍTULO: el título actual no cambia" },
    draft.excerpt ? { ok: true, text: `Bajada: «${draft.excerpt}»` } : { ok: false, text: "No trae BAJADA: la bajada actual no cambia" },
  ];

  // Listas y citas cuentan como párrafos: lo que importa es ver que el texto llegó.
  const paragraphs = blocks.filter((node) => ["paragraph", "bulletList", "orderedList", "blockquote"].includes(node.type) && (node.content?.length ?? 0) > 0).length;
  if (paragraphs > 0) items.push({ ok: true, text: plural(paragraphs, "párrafo", "párrafos") });
  const headings = blocks.filter((node) => node.type === "heading").length;
  if (headings > 0) items.push({ ok: true, text: plural(headings, "título de sección", "títulos de sección") });
  const photos = blocks.filter((node) => node.type === "image").length;
  if (photos > 0) items.push({ ok: true, text: plural(photos, "foto", "fotos") });

  // Una entrada por red y tipo (video o publicación), en el orden en que aparecen.
  const embeds = new Map<string, { embed: Embed; count: number }>();
  for (const node of blocks) {
    const embed = node.type === "embed" ? embedFromAttrs(node.attrs) : null;
    if (!embed) continue;
    const key = `${embed.provider}:${isVerticalEmbed(embed)}`;
    embeds.set(key, { embed, count: (embeds.get(key)?.count ?? 0) + 1 });
  }
  for (const { embed, count } of embeds.values()) items.push({ ok: true, text: embedLabel(embed, count) });
  return items;
}
