"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useState, type ClipboardEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PostBody } from "@/domain/post-body";
import { looksLikeAiDraft } from "@/domain/post-markdown";
import { MediaField } from "@/features/media/components/media-field";
import type { MediaDTO } from "@/features/media/dto";
import { EditorToolbar, type ToolbarPanel } from "./editor-toolbar";
import { createPostExtensions } from "./extensions";
import { EmbedPanel, LinkPanel } from "./toolbar-panels";

// Tipografía del texto dentro del editor (la misma jerarquía que ve el público, sin su tamaño).
const CONTENT_CLASS =
  "min-h-72 px-4 py-3 text-base leading-relaxed outline-none [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-bold [&_hr]:my-6 [&_hr]:border-border [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_p]:text-justify [&_h2]:text-justify [&_h3]:text-justify [&_ul]:list-disc [&_ul]:pl-6 [&_a]:text-accent-bright [&_a]:underline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-accent-bright";

type PostEditorProps = {
  /** Cuerpo guardado (JSON de Tiptap). */
  value: PostBody;
  onChange: (doc: PostBody) => void;
  /** Imágenes que ya trae el cuerpo, por id (el editor las muestra sin pedirlas). */
  media?: Record<string, MediaDTO>;
  /** Al subir una imagen desde la barra (para que el resto del formulario la conozca). */
  onMediaAdded?: (media: MediaDTO) => void;
  /** Se pegó una respuesta de la IA (con «TÍTULO:»): en vez de pegarla como texto, la carga el formulario. */
  onAiDraftPaste?: (text: string) => void;
  /** Para enlazar la etiqueta y los errores del campo. */
  id?: string;
  invalid?: boolean;
  /** `false` en los textos de Configuración: sin imágenes ni publicaciones de redes (ni sus botones). */
  allowMedia?: boolean;
  /** Nombre accesible del cuadro de texto. */
  label?: string;
};

/**
 * Editor de texto enriquecido (Tiptap). Solo ofrece los nodos permitidos para el cuerpo de una noticia: títulos H2/H3,
 * negrita, cursiva, listas, cita, enlace, separador, imagen y publicación de Instagram/YouTube/TikTok/Facebook. Pesa: se carga
 * con `next/dynamic` solo en el formulario de noticias.
 */
export function PostEditor({ value, onChange, media = {}, onMediaAdded, onAiDraftPaste, id = "post-body", invalid, allowMedia = true, label = "Cuerpo de la noticia" }: PostEditorProps) {
  const [panel, setPanel] = useState<ToolbarPanel>(null);
  const [imageOpen, setImageOpen] = useState(false);
  // Un solo mapa para toda la vida del editor: las imágenes que se suben después se agregan sin recrearlo.
  const [mediaById] = useState(() => new Map(Object.entries(media)));

  const editor = useEditor({
    extensions: createPostExtensions((mediaId) => mediaById.get(mediaId), { media: allowMedia }),
    content: value,
    // El primer render no toca el DOM del editor: evita desajustes de hidratación.
    immediatelyRender: false,
    // La barra marca el formato de donde está el cursor: se vuelve a dibujar con cada cambio de selección.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as PostBody),
    editorProps: {
      attributes: { id, role: "textbox", "aria-multiline": "true", "aria-label": label, class: CONTENT_CLASS },
    },
  });

  const closePanel = useCallback(() => setPanel(null), []);

  // En la fase de captura, antes que el editor: la respuesta de la IA no llega a pegarse como texto.
  function catchAiDraftPaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData("text/plain");
    if (!onAiDraftPaste || !looksLikeAiDraft(text)) return;
    event.preventDefault();
    event.stopPropagation();
    onAiDraftPaste(text);
  }

  function insertImage(mediaId: string | null, item: MediaDTO | null) {
    if (!mediaId || !item || !editor) return;
    mediaById.set(mediaId, item);
    onMediaAdded?.(item);
    editor.chain().focus().insertContent({ type: "image", attrs: { mediaId } }).run();
    setImageOpen(false);
  }

  if (!editor) return <div className="min-h-72 border border-border bg-card" aria-hidden />;

  return (
    <div className={`border bg-background ${invalid ? "border-destructive" : "border-border"}`}>
      <EditorToolbar editor={editor} panel={panel} onPanelChange={setPanel} onInsertImage={() => setImageOpen(true)} allowMedia={allowMedia} />
      {panel === "link" ? <LinkPanel editor={editor} onClose={closePanel} /> : null}
      {panel === "embed" && allowMedia ? <EmbedPanel editor={editor} onClose={closePanel} /> : null}
      <EditorContent editor={editor} onPasteCapture={catchAiDraftPaste} />

      {allowMedia ? (
        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insertar imagen</DialogTitle>
              <DialogDescription>Sube la foto: se agrega al texto donde dejaste el cursor.</DialogDescription>
            </DialogHeader>
            {/* Dentro del diálogo (fuera del formulario): este campo no se envía con la noticia. */}
            <MediaField kind="gallery" name="postBodyImage" onChange={insertImage} />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
