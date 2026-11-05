"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/admin/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { collectBodyMediaIds, type PostBody } from "@/domain/post-body";
import { parsePostMarkdown } from "@/domain/post-markdown";
import type { MediaDTO } from "@/features/media/dto";
import { readFormText, writeFormText } from "@/lib/form-dom";
import type { DraftNotices } from "./ai-writer/ai-answer-step";
import { WritingModeSwitch, type WritingMode } from "./writing-mode-switch";

// Tiptap solo se descarga en el formulario de noticias, y recién cuando se monta el editor.
const PostEditor = dynamic(() => import("../editor/post-editor").then((module) => module.PostEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

// El publicador «Con IA» se descarga la primera vez que se elige.
const AiWriterPanel = dynamic(() => import("./ai-writer/ai-writer-panel").then((module) => module.AiWriterPanel), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

/**
 * Espera antes de avisar un cambio del cuerpo (vista previa): avisar en cada tecla volvería a dibujar el formulario
 * entero mientras se escribe.
 */
const BODY_NOTICE_DELAY_MS = 300;

type PostEditorFieldProps = {
  initial: PostBody;
  media: Record<string, MediaDTO>;
  error?: string;
  /** Cada cambio del cuerpo y cada imagen nueva (para la vista previa en vivo). */
  onBodyChange?: (body: PostBody) => void;
  onMediaAdded?: (media: MediaDTO[]) => void;
};

/**
 * El cuerpo de la noticia con dos publicadores: «Escribir» (el editor) y «Con IA» (pegar la respuesta de una IA). Los dos
 * escriben el mismo cuerpo, que viaja en el campo oculto `body` al guardar. Una respuesta de la IA pegada en el editor
 * se carga igual que desde «Con IA».
 */
export function PostEditorField({ initial, media: initialMedia, error, onBodyChange, onMediaAdded }: PostEditorFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState(initial);
  const [media, setMedia] = useState(initialMedia);
  // Cargar un texto desde la IA vuelve a montar el editor con ese contenido (`version`).
  const [editorContent, setEditorContent] = useState({ doc: initial, version: 0 });
  const [mode, setMode] = useState<WritingMode>("write");
  const [aiOpened, setAiOpened] = useState(false);

  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  function changeBody(next: PostBody, { immediate = false } = {}) {
    setBody(next);
    clearTimeout(noticeTimer.current);
    if (immediate) onBodyChange?.(next);
    else noticeTimer.current = setTimeout(() => onBodyChange?.(next), BODY_NOTICE_DELAY_MS);
  }

  function addMedia(items: MediaDTO[]) {
    setMedia((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.id, item])) }));
    onMediaAdded?.(items);
  }

  function replaceBody(doc: PostBody, photos: MediaDTO[]) {
    addMedia(photos);
    setEditorContent((current) => ({ doc, version: current.version + 1 }));
    changeBody(doc, { immediate: true });
    setMode("write");
  }

  /** Respuesta de la IA → título y bajada (pestaña Datos) y cuerpo, con «Deshacer». `photos[0]` es la «FOTO 1». */
  function applyDraft(answer: string, photos: MediaDTO[]): DraftNotices {
    const draft = parsePostMarkdown(answer, photos.map((photo) => photo.id));
    if (!draft.body) return { error: draft.error, warnings: draft.warnings };

    const form = rootRef.current?.closest("form");
    const previous = { body, title: readFormText(form, "title"), excerpt: readFormText(form, "excerpt") };
    if (draft.title !== null) writeFormText(form, "title", draft.title);
    if (draft.excerpt !== null) writeFormText(form, "excerpt", draft.excerpt);
    replaceBody(draft.body, photos);
    toast.success("Texto cargado en la noticia. Revísalo antes de guardar.", {
      description: [draft.title !== null || draft.excerpt !== null ? "El título y la bajada quedaron en «Datos»." : "", ...draft.warnings].join(" ").trim() || undefined,
      // Tiempo para revisar el resultado y decidir si deshacer.
      duration: 15_000,
      action: {
        label: "Deshacer",
        onClick: () => {
          writeFormText(form, "title", previous.title);
          writeFormText(form, "excerpt", previous.excerpt);
          replaceBody(previous.body, []);
        },
      },
    });
    return { warnings: draft.warnings };
  }

  /** Se pegó una respuesta de la IA en «Escribir»: sus «[FOTO N]» son las imágenes que ya están en el texto. */
  function pasteAiDraft(answer: string) {
    const photos = collectBodyMediaIds(body).flatMap((id) => (media[id] ? [media[id]] : []));
    const notices = applyDraft(answer, photos);
    if (notices.error) toast.error(notices.error);
  }

  function chooseMode(next: WritingMode) {
    setMode(next);
    if (next === "ai") setAiOpened(true);
  }

  return (
    <div ref={rootRef}>
      <FormField
        id="post-body"
        label="Texto de la noticia"
        error={error}
        hint="Para mostrar un video o una publicación, pega su link de YouTube, Instagram, TikTok o Facebook: solo en una línea vacía o dentro de una frase."
        help={
          <>
            <p>
              <strong>Escribir:</strong> escribes o pegas el texto y le das formato con la barra (títulos, negrita, listas, fotos).
            </p>
            <p>
              <strong>Con IA:</strong> le cuentas a ChatGPT, Claude o Gemini qué pasó y te entrega la noticia redactada. La pegas y queda lista para revisar.
            </p>
            <p>Si pegas en «Escribir» una respuesta de la IA que empieza con «TÍTULO:», también se carga sola: el título y la bajada van a «Datos».</p>
          </>
        }
      >
        <input type="hidden" name="body" value={JSON.stringify(body)} />
        <WritingModeSwitch mode={mode} onChange={chooseMode} />
        <div hidden={mode !== "write"}>
          <PostEditor
            key={editorContent.version}
            value={editorContent.doc}
            onChange={(next) => changeBody(next)}
            onMediaAdded={(item) => addMedia([item])}
            onAiDraftPaste={pasteAiDraft}
            media={media}
            invalid={Boolean(error)}
          />
        </div>
        {aiOpened ? (
          <div hidden={mode !== "ai"}>
            <AiWriterPanel body={body} media={media} onApply={applyDraft} />
          </div>
        ) : null}
      </FormField>
    </div>
  );
}
