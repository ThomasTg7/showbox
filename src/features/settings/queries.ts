import { eq } from "drizzle-orm";
import { siteSettings } from "@/db/schema/settings";
import type { Executor } from "@/db/types";
import { defaultSetting, parseSetting, SETTING_KEYS, type SettingKey, type SettingsMap, type SettingValue } from "./registry";

/** Lo guardado, o el valor vacío si no existe o ya no tiene la forma esperada (la pantalla nunca se rompe por un dato viejo). */
function readStored<K extends SettingKey>(key: K, raw: unknown): SettingValue<K> {
  const parsed = parseSetting(key, raw ?? {});
  return parsed.success ? parsed.data : defaultSetting(key);
}

export async function getSetting<K extends SettingKey>(db: Executor, key: K): Promise<SettingValue<K>> {
  const [row] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return readStored(key, row?.value);
}

/** Todas las claves en una sola consulta (el panel de Configuración). */
export async function getAllSettings(db: Executor): Promise<SettingsMap> {
  const rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, readStored(key, stored.get(key))])) as SettingsMap;
}
