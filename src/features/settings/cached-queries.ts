import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { mediaCacheTag } from "@/features/media/cache";
import { getMedia } from "@/features/media/queries";
import type { MediaDTO } from "@/features/media/dto";
import { SETTINGS_TAG } from "./cache";
import { getSetting } from "./queries";
import type { SettingKey, SettingValue } from "./registry";

// Lecturas del sitio público cacheadas con etiquetas. Todo lo que devuelven es JSON (la caché serializa): las fechas van como texto ISO.

// Cubre lo que ninguna action dispara (p. ej. un cambio hecho directo en la base).
const REVALIDATE_SECONDS = 300;

/** Una clave de la configuración (footer, Nosotros, Privacidad, FAQ…). Guardarla en el panel expira `settings`. */
export function getCachedSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  return unstable_cache(() => getSetting(db, key), ["setting", key], { tags: [SETTINGS_TAG], revalidate: REVALIDATE_SECONDS })();
}

/**
 * La imagen que se muestra al compartir el sitio. Primero la clave `share` (cacheada, `settings`) dice cuál es; después la
 * imagen se cachea con su propia etiqueta: reeditarla o cambiarla vuelve a leerla. `null` si no hay o ya no está disponible.
 */
export async function getCachedShareImage(): Promise<MediaDTO | null> {
  const { ogMediaId } = await getCachedSetting("share");
  if (!ogMediaId) return null;
  return unstable_cache(() => getMedia(db, ogMediaId), ["share-image", ogMediaId], {
    tags: [SETTINGS_TAG, mediaCacheTag(ogMediaId)],
    revalidate: REVALIDATE_SECONDS,
  })();
}
