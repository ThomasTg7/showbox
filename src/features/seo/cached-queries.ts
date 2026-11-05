import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { DIVISIONS_CACHE_TAG } from "@/features/divisions/cache";
import { EVENTS_LIST_TAG } from "@/features/events/cache";
import { FIGHTERS_LIST_TAG } from "@/features/fighters/cache";
import { POSTS_LIST_TAG } from "@/features/posts/cache";
import { RANKINGS_TAG } from "@/features/rankings/cache";
import { SETTINGS_TAG } from "@/features/settings/cache";
import { siteOrigin } from "@/lib/site-urls";
import { getSitemapEntries } from "./sitemap-entries";

// Mismo tope que el resto del sitio público: lo programado que llega a su hora aparece con hasta 5 minutos de retraso.
const REVALIDATE_SECONDS = 300;

/** El sitemap lee varias tablas: se cachea con las etiquetas de lo que lista, así publicar o despublicar lo actualiza al instante. */
export function getCachedSitemapEntries() {
  const siteUrl = siteOrigin();
  return unstable_cache(() => getSitemapEntries(db, siteUrl), ["sitemap", siteUrl], {
    tags: [FIGHTERS_LIST_TAG, EVENTS_LIST_TAG, POSTS_LIST_TAG, RANKINGS_TAG, DIVISIONS_CACHE_TAG, SETTINGS_TAG],
    revalidate: REVALIDATE_SECONDS,
  })();
}
