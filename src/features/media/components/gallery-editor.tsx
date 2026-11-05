"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { MEDIA_SPECS, describeSpec, formatsLabel } from "@/domain/media-specs";
import type { MediaDTO } from "../dto";
import { HEIC_ACCEPT } from "../heic";
import { EditorDialog } from "./editor-dialog";
import { GalleryItem } from "./gallery-item";
import { MediaDropzone } from "./media-dropzone";
import { uploadAndSave } from "./upload-original";
import { prepareFile, useMediaEditing } from "./use-media-editing";

type GalleryEditorProps = {
  /** Fotos ya guardadas, en orden (las carga el servidor con `getMediaByIds`). */
  media?: MediaDTO[];
  onChange?: (mediaIds: string[]) => void;
  /** Igual que `onChange`, con las fotos completas (para mostrarlas en otro lado sin pedirlas). */
  onMediaChange?: (media: MediaDTO[]) => void;
  /** Texto del botón para subir: sin fotos y con fotos. */
  uploadLabels?: { empty: string; more: string };
  /** Muestra «FOTO N» sobre cada miniatura, también en celular (cuando el número importa, como en «Con IA»). */
  numbered?: boolean;
  /** Contenido extra bajo cada foto (recibe la foto y su posición, desde 0). */
  renderItemExtra?: (media: MediaDTO, index: number) => ReactNode;
};

const SPEC = MEDIA_SPECS.gallery;

const DEFAULT_UPLOAD_LABELS = { empty: "Subir fotos de la galería", more: "Agregar más fotos" };

export function GalleryEditor({ media: initialMedia = [], onChange, onMediaChange, uploadLabels = DEFAULT_UPLOAD_LABELS, numbered = false, renderItemExtra }: GalleryEditorProps) {
  const [items, setItems] = useState<MediaDTO[]>(initialMedia);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const commit = useCallback(
    (next: MediaDTO[]) => {
      setItems(next);
      onChange?.(next.map((item) => item.id));
      onMediaChange?.(next);
    },
    [onChange, onMediaChange],
  );

  const handleEdited = useCallback(
    (saved: MediaDTO) => commit(items.map((item) => (item.id === saved.id ? saved : item))),
    [commit, items],
  );
  const editing = useMediaEditing("gallery", handleEdited);
  const busy = progress !== null || editing.phase.name !== "idle";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function addFiles(files: File[]) {
    const added: MediaDTO[] = [];
    const failures: string[] = [];
    setProgress({ done: 0, total: files.length });

    for (const [index, file] of files.entries()) {
      try {
        added.push(await uploadAndSave("gallery", await prepareFile("gallery", file)));
      } catch (error) {
        failures.push(`${file.name}: ${error instanceof Error ? error.message : "no se pudo subir"}`);
      }
      setProgress({ done: index + 1, total: files.length });
    }

    setErrors(failures);
    setProgress(null);
    if (added.length > 0) commit([...items, ...added]);
  }

  function move(from: number, to: number) {
    commit(arrayMove(items, from, to));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    move(items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id));
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      {items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {items.map((item, index) => (
                <GalleryItem
                  key={item.id}
                  media={item}
                  position={index}
                  total={items.length}
                  numbered={numbered}
                  extra={renderItemExtra?.(item, index)}
                  disabled={busy}
                  onMove={(delta) => move(index, index + delta)}
                  onEdit={() => editing.reopen(item)}
                  onRemove={() => commit(items.filter((other) => other.id !== item.id))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      <p data-slot="media-recommendation" className="text-sm text-muted-foreground">
        {describeSpec("gallery")}
      </p>
      <MediaDropzone
        multiple
        accept={[...SPEC.accepts, ...HEIC_ACCEPT]}
        disabled={busy}
        label={items.length > 0 ? uploadLabels.more : uploadLabels.empty}
        hint={`Arrastra las fotos aquí o toca para elegirlas · ${formatsLabel("gallery")} · máx. 15 MB cada una`}
        onFiles={addFiles}
      />

      <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
        {progress ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" /> Subiendo foto {Math.min(progress.done + 1, progress.total)} de {progress.total}…
          </>
        ) : null}
      </p>
      {[...errors, ...(editing.error ? [editing.error] : [])].map((message, index) => (
        <p key={index} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ))}

      <EditorDialog
        kind="gallery"
        session={editing.session}
        onSave={editing.save}
        onCancel={editing.cancel}
        onBackgroundRemoved={editing.replaceWithCutout}
        returnFocusTo={containerRef}
      />
    </div>
  );
}
