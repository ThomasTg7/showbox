import { updateTag } from "next/cache";
import { RANKINGS_TAG } from "@/features/rankings/cache";

/** Tag de los listados públicos (`/boxeadores`, home). */
export const FIGHTERS_LIST_TAG = "fighters";

export function fighterCacheTag(id: string): string {
  return `fighter:${id}`;
}

/**
 * Expira al instante la ficha del boxeador y los listados donde aparece, y los rankings (retirar, despublicar o enviar
 * a la papelera a un boxeador rankeado lo saca del ranking público sin repetirlo en cada action). Solo desde server
 * actions: `updateTag` (a diferencia de `revalidateTag`) no sirve contenido viejo ni una vez, y enviar a la papelera debe ocultarlo ya.
 */
export function revalidateFighter(id: string): void {
  updateTag(fighterCacheTag(id));
  updateTag(FIGHTERS_LIST_TAG);
  updateTag(RANKINGS_TAG);
}
