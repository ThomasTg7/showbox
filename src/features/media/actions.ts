"use server";

import { updateTag } from "next/cache";
import { db } from "@/db";
import { logAudit } from "@/features/audit/log";
import { getStorage } from "@/lib/storage";
import { requireAdmin } from "@/lib/require-admin";
import { runUserFacing } from "@/lib/user-facing-error";
import { MEDIA_ANY_TAG, mediaCacheTag } from "./cache";
import type { MediaDTO } from "./dto";
import { getMediaEdit } from "./queries";
import { createUploadSchema, mediaEditSchema, mediaIdSchema } from "./schema";
import { MediaError, createUpload, finalizeUpload, saveMediaEdit } from "./service";

export type MediaActionResult<T> = { error: string } | { data: T };

/** `MediaError` es un `UserFacingError`: su mensaje llega tal cual; lo demás queda en el log y se ve `fallbackError`. */
async function run<T>(fallbackError: string, task: () => Promise<T>): Promise<MediaActionResult<T>> {
  const result = await runUserFacing(fallbackError, task, fallbackError);
  return "value" in result ? { data: result.value } : result;
}

export async function createUploadAction(input: unknown) {
  await requireAdmin();

  const parsed = createUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" } as const;

  return run("No se pudo preparar la subida", () => createUpload(db, getStorage(), parsed.data));
}

export async function finalizeUploadAction(mediaId: unknown) {
  await requireAdmin();

  const parsed = mediaIdSchema.safeParse(mediaId);
  if (!parsed.success) return { error: "Datos inválidos" } as const;

  return run("No se pudo procesar la imagen", () => finalizeUpload(db, getStorage(), parsed.data));
}

export async function getMediaEditAction(mediaId: unknown) {
  await requireAdmin();

  const parsed = mediaIdSchema.safeParse(mediaId);
  if (!parsed.success) return { error: "Datos inválidos" } as const;

  return run("No se pudo abrir la imagen", async () => {
    const edit = await getMediaEdit(db, parsed.data);
    if (!edit) throw new MediaError("No se encontró la imagen");
    return edit;
  });
}

export async function saveMediaEditAction(mediaId: unknown, edit: unknown): Promise<MediaActionResult<MediaDTO>> {
  const admin = await requireAdmin();

  const parsedId = mediaIdSchema.safeParse(mediaId);
  const parsedEdit = mediaEditSchema.safeParse(edit);
  if (!parsedId.success || !parsedEdit.success) return { error: "Datos inválidos" };

  const result = await run("No se pudo guardar la imagen", () =>
    saveMediaEdit(db, getStorage(), parsedId.data, parsedEdit.data),
  );

  if ("data" in result) {
    await logAudit(db, {
      actorId: admin.userId,
      action: "update",
      entityType: "media",
      entityId: result.data.id,
      summary: `Guardó una imagen (${result.data.kind})`,
    });
    updateTag(mediaCacheTag(result.data.id));
    updateTag(MEDIA_ANY_TAG);
  }
  return result;
}
