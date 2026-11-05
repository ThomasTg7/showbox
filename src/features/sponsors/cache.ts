import { updateTag } from "next/cache";

/** Tag de las lecturas públicas de patrocinadores (home, página de evento y footer). */
export const SPONSORS_TAG = "sponsors";

/** Expira al instante los patrocinadores públicos. Solo desde server actions (`updateTag`, no `revalidateTag`). */
export function revalidateSponsors(): void {
  updateTag(SPONSORS_TAG);
}
