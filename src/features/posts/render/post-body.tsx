import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { MediaImage } from "@/components/media/media-image";
import { embedFromAttrs } from "@/domain/embed";
import { isSafeHref, textAlignOf, type PostMark, type PostNode, type TextAlign } from "@/domain/post-body";
import type { MediaDTO } from "@/features/media/dto";
import { EmbedFacade } from "./embed-facade";

/** Ancho real de la columna de lectura (720 px en escritorio, toda la pantalla en celular). */
export const BODY_IMAGE_SIZES = "(min-width: 768px) 720px, 100vw";

const MAX_DEPTH = 12;
const EXTERNAL_REL = "noopener noreferrer nofollow";
const LINK_CLASS = "text-accent-bright underline underline-offset-4 hover:text-accent-bright-hover";

/** Justificado (el de siempre) con guiones en español: en celular la columna es angosta y sin cortar palabras quedan huecos. */
const ALIGN_CLASS: Record<TextAlign, string> = { justify: "text-justify hyphens-auto", left: "text-left", center: "text-center", right: "text-right" };
const alignProps = (node: PostNode) => ({ "data-align": textAlignOf(node) });

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function renderText(node: PostNode, key: string): ReactNode {
  let output: ReactNode = node.text ?? "";
  for (const mark of (node.marks ?? []) as PostMark[]) {
    if (mark.type === "bold") output = <strong>{output}</strong>;
    else if (mark.type === "italic") output = <em>{output}</em>;
    else if (mark.type === "link") output = renderLink(mark, output);
  }
  return <Fragment key={key}>{output}</Fragment>;
}

/** Los enlaces de afuera se abren en otra pestaña sin pasar autoridad; uno que no es seguro se muestra solo como texto. */
function renderLink(mark: PostMark, children: ReactNode): ReactNode {
  const href = mark.attrs?.href;
  if (!isSafeHref(href)) return children;
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={LINK_CLASS}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel={EXTERNAL_REL} className={LINK_CLASS}>
      {children}
    </a>
  );
}

function renderEmbed(node: PostNode, key: string): ReactNode {
  const embed = embedFromAttrs(node.attrs);
  return embed ? <EmbedFacade key={key} embed={embed} /> : null;
}

function renderImage(node: PostNode, media: Record<string, MediaDTO>, key: string): ReactNode {
  const mediaId = node.attrs?.mediaId;
  const item = typeof mediaId === "string" ? media[mediaId] : undefined;
  // Una imagen que ya no existe se omite: la noticia se lee igual.
  if (!item) return null;
  return (
    <figure key={key} className="my-8">
      <MediaImage media={item} sizes={BODY_IMAGE_SIZES} className="h-auto w-full" />
    </figure>
  );
}

function renderChildren(node: PostNode, media: Record<string, MediaDTO>, depth: number, key: string): ReactNode[] {
  return (node.content ?? []).map((child, index) => renderNode(child, media, depth + 1, `${key}.${index}`));
}

function renderNode(node: PostNode, media: Record<string, MediaDTO>, depth: number, key: string): ReactNode {
  if (depth > MAX_DEPTH || !isRecord(node)) return null;
  const children = () => renderChildren(node, media, depth, key);

  switch (node.type) {
    case "text":
      return typeof node.text === "string" ? renderText(node, key) : null;
    case "hardBreak":
      return <br key={key} />;
    case "paragraph":
      return (
        <p key={key} {...alignProps(node)} className={`my-5 text-lg leading-relaxed text-white/90 ${ALIGN_CLASS[textAlignOf(node)]}`}>
          {children()}
        </p>
      );
    case "heading": {
      const level = node.attrs?.level;
      if (level === 2) {
        return (
          <h2 key={key} {...alignProps(node)} className={`mt-12 mb-4 font-display text-3xl leading-tight tracking-wide uppercase md:text-4xl ${ALIGN_CLASS[textAlignOf(node)]}`}>
            {children()}
          </h2>
        );
      }
      if (level === 3) {
        return (
          <h3 key={key} {...alignProps(node)} className={`mt-8 mb-3 font-cond text-2xl font-bold tracking-wide text-accent-bright uppercase ${ALIGN_CLASS[textAlignOf(node)]}`}>
            {children()}
          </h3>
        );
      }
      return null;
    }
    case "bulletList":
      return (
        <ul key={key} className="my-5 list-disc space-y-2 pl-6 text-lg leading-relaxed text-white/90 marker:text-accent-bright">
          {children()}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="my-5 list-decimal space-y-2 pl-6 text-lg leading-relaxed text-white/90 marker:font-bold marker:text-accent-bright">
          {children()}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children()}</li>;
    case "blockquote":
      return (
        <blockquote key={key} className="my-8 border-l-4 border-brand bg-surface px-5 py-2 text-xl italic [&_p]:my-3">
          {children()}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={key} className="my-10 border-border" />;
    case "image":
      return renderImage(node, media, key);
    case "embed":
      return renderEmbed(node, key);
    default:
      // Nodo desconocido (o no permitido): se omite con todo su contenido.
      return null;
  }
}

/**
 * Cuerpo de una noticia, del JSON de Tiptap a React. Solo dibuja los nodos permitidos (`domain/post-body.ts`); nunca
 * HTML crudo: lo que no se conoce se omite. `media` son las imágenes del cuerpo, ya leídas con el resto de la página.
 */
export function PostBody({ doc, media }: { doc: unknown; media: Record<string, MediaDTO> }) {
  if (!isRecord(doc) || doc.type !== "doc" || !Array.isArray(doc.content)) return null;
  return <div className="post-body">{doc.content.map((node, index) => renderNode(node as PostNode, media, 1, String(index)))}</div>;
}
