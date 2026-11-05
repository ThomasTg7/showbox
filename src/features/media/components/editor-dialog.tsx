"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, type RefObject } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MEDIA_SPECS, type MediaKind } from "@/domain/media-specs";
import type { MediaEdit } from "../schema";
import type { EditingSession } from "./use-media-editing";

// react-easy-crop y el editor solo se descargan cuando alguien abre una imagen.
const ImageEditor = dynamic(() => import("./image-editor").then((module) => module.ImageEditor), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="w-full flex-1" />
    </div>
  ),
});

type EditorDialogProps = {
  kind: MediaKind;
  session: EditingSession | null;
  onSave: (edit: MediaEdit) => void;
  onCancel: () => void;
  onBackgroundRemoved?: (cutout: Blob) => void;
  /** Campo que contiene los botones "Editar" (`data-media-trigger`): al cerrar, el foco vuelve ahí. */
  returnFocusTo: RefObject<HTMLElement | null>;
};

/** Marca el botón "Editar" de una imagen para devolverle el foco al cerrar el editor. */
export const mediaTriggerAttribute = (mediaId: string) => ({ "data-media-trigger": mediaId });

export function EditorDialog({ kind, session, onSave, onCancel, onBackgroundRemoved, returnFocusTo }: EditorDialogProps) {
  const lastMediaId = useRef<string | null>(null);
  useEffect(() => {
    if (session) lastMediaId.current = session.mediaId;
  }, [session]);

  // El botón que abrió el editor se deshabilita mientras carga y pierde el foco, así que Radix no sabría
  // adónde devolverlo: se busca el "Editar" de la imagen recién editada o, si no existe, el primer control del campo.
  function restoreFocus(event: Event) {
    const container = returnFocusTo.current;
    if (!container) return;
    const trigger =
      container.querySelector<HTMLElement>(`[data-media-trigger="${lastMediaId.current}"]:not(:disabled)`) ??
      container.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled)");
    if (!trigger) return;
    event.preventDefault();
    trigger.focus();
  }

  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        onCloseAutoFocus={restoreFocus}
        // Pantalla completa en celular; en PC una ventana alta con pie fijo. El contenido reparte la altura.
        className="flex h-dvh max-h-dvh w-full max-w-full flex-col gap-0 rounded-none p-0 sm:h-[min(92dvh,52rem)] sm:max-w-6xl 2xl:max-w-7xl sm:rounded-xl"
      >
        <div className="px-4 pt-4 pb-3 pr-14">
          <DialogTitle className="text-lg font-semibold">Editar imagen · {MEDIA_SPECS[kind].label}</DialogTitle>
          <DialogDescription className="sr-only sm:not-sr-only">
            Recorta, ajusta y revisa cómo se verá antes de guardar.
          </DialogDescription>
        </div>
        {session ? (
          <ImageEditor
            // Al cambiar de imagen (p. ej. tras quitar el fondo) se reinicia todo el editor.
            key={session.mediaId}
            kind={kind}
            src={session.src}
            natural={session.natural}
            initial={session.initial}
            onSave={onSave}
            onCancel={onCancel}
            onBackgroundRemoved={onBackgroundRemoved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
