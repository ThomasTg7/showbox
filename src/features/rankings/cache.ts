import { updateTag } from "next/cache";

/** Tag de las lecturas públicas de rankings, campeones y las etiquetas de campeón/puesto de fichas y carteleras. */
export const RANKINGS_TAG = "rankings";

/** Expira al instante los rankings públicos. Solo desde server actions (`updateTag`, no `revalidateTag`). */
export function revalidateRankings(): void {
  updateTag(RANKINGS_TAG);
}
