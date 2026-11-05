import { updateTag } from "next/cache";

/** Tag de las lecturas públicas de la configuración del sitio (footer, páginas fijas, FAQ de entradas). */
export const SETTINGS_TAG = "settings";

/** Expira al instante la configuración pública. Solo desde server actions (`updateTag`, no `revalidateTag`). */
export function revalidateSettings(): void {
  updateTag(SETTINGS_TAG);
}
