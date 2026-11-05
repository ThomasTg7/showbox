import { asc } from "drizzle-orm";
import type { MetadataRoute } from "next";
import type { Db } from "@/db";
import { publicScope } from "@/db/public-scope";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { posts } from "@/db/schema/posts";
import { hasPostBodyContent } from "@/domain/post-body";
import { listPublicPostCategories } from "@/features/posts/queries";
import { postsListHref } from "@/features/posts/public-list";
import { getPublicRankings } from "@/features/rankings/queries";
import { rankingsHref } from "@/features/rankings/public-level";
import { contactDetails } from "@/features/settings/contact-details";
import { getAllSettings } from "@/features/settings/queries";
import type { BoutLevel } from "@/domain/bout-enums";

type Entry = MetadataRoute.Sitemap[number];
type Dated = { slug: string; updatedAt: Date };

function newest(dates: Date[]): Date | undefined {
  return dates.length === 0 ? undefined : new Date(Math.max(...dates.map((date) => date.getTime())));
}

/** `lastModified` de un nivel de rankings: la versión vigente más nueva de sus tarjetas (= la versión más nueva del nivel). */
async function rankingsEntry(db: Db, level: BoutLevel, siteUrl: string): Promise<Entry[]> {
  const { cards } = await getPublicRankings(db, level);
  if (cards.length === 0) return [];
  const lastModified = newest(cards.flatMap((card) => (card.updatedAt ? [new Date(card.updatedAt)] : [])));
  return [{ url: `${siteUrl}${rankingsHref(level)}`, ...(lastModified ? { lastModified } : {}) }];
}

/**
 * Todo lo público y que Google debe encontrar: la home, los listados, las páginas fijas que ya tienen contenido, los
 * rankings visibles y cada boxeador, evento y noticia público *ahora* (`publicScope`: nada de borradores, programados que
 * aún no llegan ni papelera). Una consulta por entidad con solo `slug` y `updated_at`: nunca las fichas completas.
 * Debe coincidir con lo que las páginas dejan indexar (una página vacía lleva `noindex`, aquí tampoco aparece).
 */
export async function getSitemapEntries(db: Db, siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const [fighterRows, eventRows, postRows, categories, settings, proRankings, amateurRankings] = await Promise.all([
    db.select({ slug: fighters.slug, updatedAt: fighters.updatedAt }).from(fighters).where(publicScope(fighters)).orderBy(asc(fighters.slug)),
    db.select({ slug: events.slug, updatedAt: events.updatedAt }).from(events).where(publicScope(events)).orderBy(asc(events.slug)),
    db.select({ slug: posts.slug, updatedAt: posts.updatedAt }).from(posts).where(publicScope(posts)).orderBy(asc(posts.slug)),
    listPublicPostCategories(db),
    getAllSettings(db),
    rankingsEntry(db, "pro", siteUrl),
    rankingsEntry(db, "amateur", siteUrl),
  ]);

  const listing = (path: string, rows: Dated[]): Entry => {
    const lastModified = newest(rows.map((row) => row.updatedAt));
    return { url: `${siteUrl}${path}`, ...(lastModified ? { lastModified } : {}) };
  };
  const detail = (base: string, rows: Dated[]): Entry[] => rows.map((row) => ({ url: `${siteUrl}${base}/${row.slug}`, lastModified: row.updatedAt }));

  const fixedPages: Entry[] = [
    ...(hasPostBodyContent(settings.about.body) ? [{ url: `${siteUrl}/nosotros` }] : []),
    ...(contactDetails(settings.contact, settings.socials).hasDetails ? [{ url: `${siteUrl}/contacto` }] : []),
    ...(hasPostBodyContent(settings.privacy.body)
      ? [{ url: `${siteUrl}/privacidad`, ...(settings.privacy.updatedAt ? { lastModified: new Date(settings.privacy.updatedAt) } : {}) }]
      : []),
  ];

  return [
    { url: siteUrl },
    listing("/eventos", eventRows),
    listing("/boxeadores", fighterRows),
    listing("/noticias", postRows),
    { url: `${siteUrl}/entradas` },
    { url: `${siteUrl}/quiero-pelear` },
    { url: `${siteUrl}/patrocinar` },
    ...fixedPages,
    ...proRankings,
    ...amateurRankings,
    ...detail("/boxeadores", fighterRows),
    ...detail("/eventos", eventRows),
    ...detail("/noticias", postRows),
    ...categories.map((category) => ({ url: `${siteUrl}${postsListHref(category.slug, 1)}` })),
  ];
}
