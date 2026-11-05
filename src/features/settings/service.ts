import { isDeepStrictEqual } from "node:util";
import type { Db } from "@/db";
import { siteSettings } from "@/db/schema/settings";
import type { Executor } from "@/db/types";
import { logAudit } from "@/features/audit/log";
import { assertUsableMedia } from "@/features/media/service";
import { zodFieldErrors } from "@/lib/form-errors";
import { getSetting } from "./queries";
import { parseSetting, SETTING_LABELS, type SettingKey, type SettingValue } from "./registry";

export type SaveSettingResult<K extends SettingKey> = { ok: true; value: SettingValue<K> } | { ok: false; errors: Record<string, string> };

/** La política lleva la fecha del último cambio de su texto: guardar sin tocar el texto no la mueve. */
async function stampPrivacy(tx: Executor, value: SettingValue<"privacy">, now: Date): Promise<SettingValue<"privacy">> {
  const current = await getSetting(tx, "privacy");
  // jsonb reordena las claves al guardar: se compara el contenido, no el texto del JSON.
  const unchanged = isDeepStrictEqual(current.body, value.body);
  return { ...value, updatedAt: unchanged && current.updatedAt ? current.updatedAt : now.toISOString() };
}

/**
 * Valida con el esquema de la clave y la guarda (reemplaza el valor anterior) con su auditoría en la misma transacción.
 * Un valor inválido devuelve un error por campo y no toca nada; una imagen que no existe lanza `UserFacingError`.
 */
export async function saveSetting<K extends SettingKey>(db: Db, key: K, input: unknown, actorId: string, now: Date = new Date()): Promise<SaveSettingResult<K>> {
  const parsed = parseSetting(key, input);
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error) };

  if (key === "share") {
    await assertUsableMedia(db, [{ id: (parsed.data as SettingValue<"share">).ogMediaId, kind: "og_image" }]);
  }

  const value = await db.transaction(async (tx) => {
    const stored = key === "privacy" ? await stampPrivacy(tx, parsed.data as SettingValue<"privacy">, now) : parsed.data;
    await tx
      .insert(siteSettings)
      .values({ key, value: stored })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: stored, updatedAt: now } });
    await logAudit(tx, { actorId, action: "update", entityType: "settings", entityId: key, summary: `Se actualizó la configuración: ${SETTING_LABELS[key]}` });
    return stored as SettingValue<K>;
  });
  return { ok: true, value };
}
