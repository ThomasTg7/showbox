import { unstable_cache } from "next/cache";
import { db } from "@/db";
import type { SponsorPlacement } from "@/domain/sponsors";
import { MEDIA_ANY_TAG } from "@/features/media/cache";
import { SPONSORS_TAG } from "./cache";
import type { SponsorDTO } from "./dto";
import { listSponsorsFor } from "./queries";

// Lecturas del sitio público cacheadas con etiquetas. Todo es JSON (la caché serializa).

// La vigencia cambia a medianoche (hora de Ecuador) sin que ninguna action lo dispare: la caché se renueva sola cada 5 minutos.
const REVALIDATE_SECONDS = 300;

/** Patrocinadores visibles hoy en una ubicación (`eventId` para la página de un evento). Sus logos llevan `media`. */
export function getCachedSponsors(placement: SponsorPlacement, eventId?: string): Promise<SponsorDTO[]> {
  return unstable_cache(() => listSponsorsFor(db, placement, { eventId }), ["sponsors", placement, eventId ?? "all"], {
    tags: [SPONSORS_TAG, MEDIA_ANY_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}
