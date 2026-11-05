import type { MediaKind } from "@/domain/media-specs";
import { createUploadAction, finalizeUploadAction, saveMediaEditAction } from "../actions";
import type { MediaDTO } from "../dto";
import { DEFAULT_EDIT } from "../schema";
import { putFile } from "../upload-file";

export type UploadedOriginal = { mediaId: string; width: number; height: number; warning?: string };

/** Pide la URL firmada, sube el original directo al almacenamiento y lo finaliza. Lanza `Error` con texto para mostrar. */
export async function uploadOriginal(
  kind: MediaKind,
  file: Blob & { name?: string },
  onProgress?: (fraction: number) => void,
): Promise<UploadedOriginal> {
  const created = await createUploadAction({ kind, contentType: file.type, size: file.size });
  if ("error" in created) throw new Error(created.error);

  await putFile(created.data.uploadUrl, created.data.headers, file, onProgress);

  const finalized = await finalizeUploadAction(created.data.mediaId);
  if ("error" in finalized) throw new Error(finalized.error);

  return { mediaId: created.data.mediaId, ...finalized.data };
}

/** Sube y guarda con la edición neutra, sin abrir el editor (fotos de galería). */
export async function uploadAndSave(
  kind: MediaKind,
  file: Blob & { name?: string },
  onProgress?: (fraction: number) => void,
): Promise<MediaDTO> {
  const uploaded = await uploadOriginal(kind, file, onProgress);
  const saved = await saveMediaEditAction(uploaded.mediaId, DEFAULT_EDIT);
  if ("error" in saved) throw new Error(saved.error);
  return saved.data;
}
