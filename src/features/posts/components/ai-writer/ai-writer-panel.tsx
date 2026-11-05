"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { collectBodyMediaIds, type PostBody } from "@/domain/post-body";
import { postToMarkdown } from "@/domain/post-markdown";
import type { MediaDTO } from "@/features/media/dto";
import { readFormText } from "@/lib/form-dom";
import { AiAnswerStep, type DraftNotices } from "./ai-answer-step";
import { AiPhotosStep } from "./ai-photos-step";
import { AiPromptStep } from "./ai-prompt-step";

type AiWriterPanelProps = {
  /** Cuerpo actual (lo que hay en el editor). */
  body: PostBody;
  /** Imágenes conocidas por id: las del cuerpo guardado y las subidas después. */
  media: Record<string, MediaDTO>;
  /** Carga la respuesta de la IA en la noticia; `photos` son las imágenes que puede traer («FOTO 1» = `photos[0]`). */
  onApply: (answer: string, photos: MediaDTO[]) => DraftNotices;
};

/**
 * «Con IA» en tres pasos: subir las fotos y contar qué muestran, contar qué pasó y copiar las instrucciones, y pegar la
 * respuesta. Lo pegado se convierte con `parsePostMarkdown` (la misma validación del servidor); título y bajada van a
 * la pestaña Datos.
 */
export function AiWriterPanel({ body, media, onApply }: AiWriterPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<MediaDTO[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [facts, setFacts] = useState("");
  const [answer, setAnswer] = useState("");
  const [notices, setNotices] = useState<DraftNotices>({ warnings: [] });

  // Las imágenes que ya están en el texto también tienen número: si no, «Copiar noticia para la IA» las perdería.
  const missing = collectBodyMediaIds(body).filter((id) => media[id] && !photos.some((photo) => photo.id === id));
  const allPhotos = missing.length > 0 ? [...photos, ...missing.map((id) => media[id]!)] : photos;
  // Estable mientras no cambien las fotos: el resumen del paso 3 no se recalcula en cada render.
  const photoKey = allPhotos.map((photo) => photo.id).join(",");
  const photoIds = useMemo(() => (photoKey ? photoKey.split(",") : []), [photoKey]);

  function load() {
    if (!answer.trim()) {
      setNotices({ error: "Pega primero la respuesta de la IA.", warnings: [] });
      return;
    }
    setNotices(onApply(answer, allPhotos));
  }

  async function copyCurrent() {
    const form = rootRef.current?.closest("form");
    const markdown = postToMarkdown({ title: readFormText(form, "title"), excerpt: readFormText(form, "excerpt"), body }, photoIds);
    try {
      await navigator.clipboard.writeText(markdown || "(la noticia todavía está vacía)");
      toast.success("Noticia copiada. Pégasela a la IA junto con lo que quieres cambiar.");
    } catch {
      toast.error("No se pudo copiar. Revisa los permisos del navegador.");
    }
  }

  return (
    <div ref={rootRef} data-slot="ai-writer" className="flex flex-col gap-5 border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">La IA redacta y tú revisas. Nada se publica hasta que guardes.</p>
      <AiPhotosStep
        photos={allPhotos}
        galleryKey={missing.join(",")}
        onPhotosChange={setPhotos}
        descriptions={descriptions}
        onDescriptionChange={(mediaId, description) => setDescriptions((current) => ({ ...current, [mediaId]: description }))}
      />
      <AiPromptStep facts={facts} onFactsChange={setFacts} photoDescriptions={allPhotos.map((photo) => descriptions[photo.id] ?? "")} />
      <AiAnswerStep answer={answer} onAnswerChange={setAnswer} photoIds={photoIds} notices={notices} onLoad={load} onCopyCurrent={copyCurrent} />
    </div>
  );
}
