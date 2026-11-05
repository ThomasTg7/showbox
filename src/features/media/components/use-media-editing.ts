"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_UPLOAD_BYTES, MEDIA_SPECS, type MediaKind } from "@/domain/media-specs";
import { getMediaEditAction, saveMediaEditAction } from "../actions";
import type { MediaDTO } from "../dto";
import type { MediaEdit } from "../schema";
import { DEFAULT_EDIT } from "../schema";
import { acceptsHeic, convertHeic, isHeicFile } from "../heic";
import { uploadOriginal } from "./upload-original";

export type EditingSession = {
  mediaId: string;
  src: string;
  natural: { w: number; h: number };
  initial?: MediaEdit;
};

type Phase = { name: "idle" } | { name: "uploading"; progress: number } | { name: "busy" };

const SVG_TYPE = "image/svg+xml";
/** Valida en el navegador para avisar al tiro; el servidor vuelve a validar todo. */
function validateFile(kind: MediaKind, file: File): string | null {
  if (!MEDIA_SPECS[kind].accepts.includes(file.type)) return "Formato no permitido";
  if (file.size > MAX_UPLOAD_BYTES) return "El archivo supera 15 MB";
  return null;
}

/** El archivo listo para subir: un HEIC se convierte a JPG; lo que no se acepta lanza el error para la persona. */
export async function prepareFile(kind: MediaKind, file: File): Promise<File> {
  let ready = file;
  if (acceptsHeic(kind) && isHeicFile(file)) {
    try {
      ready = await convertHeic(file);
    } catch {
      throw new Error("No se pudo convertir la foto HEIC. Ábrela y expórtala como JPG, e inténtalo de nuevo.");
    }
  }
  const problem = validateFile(kind, ready);
  if (problem) throw new Error(problem);
  return ready;
}

/** Flujo completo de un campo de imagen: subir → editar → guardar, y reabrir para seguir editando. */
export function useMediaEditing(kind: MediaKind, onSaved: (media: MediaDTO) => void) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [session, setSession] = useState<EditingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);

  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  const run = useCallback(async (task: () => Promise<void>) => {
    setError(null);
    try {
      await task();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Ocurrió un error inesperado");
    } finally {
      setPhase({ name: "idle" });
    }
  }, []);

  const uploadAndOpen = useCallback(
    async (file: Blob & { name?: string; type: string }) => {
      setPhase({ name: "uploading", progress: 0 });
      const uploaded = await uploadOriginal(kind, file, (progress) => setPhase({ name: "uploading", progress }));

      if (file.type === SVG_TYPE) {
        // Un logo SVG no se recorta: se guarda tal cual (sanitizado en el servidor).
        setPhase({ name: "busy" });
        const saved = await saveMediaEditAction(uploaded.mediaId, DEFAULT_EDIT);
        if ("error" in saved) throw new Error(saved.error);
        onSaved(saved.data);
        return;
      }

      releaseObjectUrl();
      objectUrl.current = URL.createObjectURL(file);
      setSession({ mediaId: uploaded.mediaId, src: objectUrl.current, natural: { w: uploaded.width, h: uploaded.height } });
    },
    [kind, onSaved, releaseObjectUrl],
  );

  const pickFile = useCallback(
    (file: File) =>
      run(async () => {
        setPhase({ name: "busy" });
        await uploadAndOpen(await prepareFile(kind, file));
      }),
    [kind, run, uploadAndOpen],
  );

  const reopen = useCallback(
    (media: MediaDTO) =>
      run(async () => {
        setPhase({ name: "busy" });
        const edit = await getMediaEditAction(media.id);
        if ("error" in edit) throw new Error(edit.error);
        let original: Blob;
        try {
          // Previously rendered non-CORS images can leave an incompatible browser cache entry.
          const response = await fetch(media.originalUrl, { cache: "reload" });
          if (!response.ok) throw new Error("La descarga de la imagen falló");
          original = await response.blob();
        } catch {
          throw new Error("No se pudo cargar la imagen. Vuelve a intentarlo.");
        }
        releaseObjectUrl();
        objectUrl.current = URL.createObjectURL(original);
        setSession({ mediaId: media.id, src: objectUrl.current, natural: { w: media.width, h: media.height }, initial: edit.data });
      }),
    [releaseObjectUrl, run],
  );

  const save = useCallback(
    (edit: MediaEdit) =>
      run(async () => {
        if (!session) return;
        setPhase({ name: "busy" });
        const saved = await saveMediaEditAction(session.mediaId, edit);
        if ("error" in saved) throw new Error(saved.error);
        onSaved(saved.data);
        releaseObjectUrl();
        setSession(null);
      }),
    [onSaved, releaseObjectUrl, run, session],
  );

  const replaceWithCutout = useCallback(
    (cutout: Blob) => run(() => uploadAndOpen(new File([cutout], "sin-fondo.png", { type: "image/png" }))),
    [run, uploadAndOpen],
  );

  const cancel = useCallback(() => {
    releaseObjectUrl();
    setSession(null);
  }, [releaseObjectUrl]);

  return { phase, session, error, pickFile, reopen, save, replaceWithCutout, cancel };
}
