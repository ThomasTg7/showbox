import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { db } from "@/db";
import type { ComputedRecord } from "@/domain/record";
import { fighterJsonLd } from "@/domain/seo";
import { getCachedFighterBouts, getCachedPublicFighter } from "@/features/fighters/cached-queries";
import type { ManualRecord } from "@/features/fighters/dto";
import { FightHistory } from "@/features/fighters/components/fight-history";
import { FighterGallery } from "@/features/fighters/components/fighter-gallery";
import { FighterHero } from "@/features/fighters/components/fighter-hero";
import { FighterInfo } from "@/features/fighters/components/fighter-info";
import { NextBout } from "@/features/fighters/components/next-bout";
import { PreviewBanner } from "@/features/fighters/components/preview-banner";
import { RecordSummary } from "@/features/fighters/components/record-summary";
import { divisionTitle } from "@/features/fighters/labels";
import { getPublicFighterBySlug } from "@/features/fighters/queries";
import { getCachedPostsForFighter } from "@/features/posts/cached-queries";
import { getCachedFighterRankingTags } from "@/features/rankings/cached-queries";
import { RelatedNewsRail } from "@/features/posts/components/related-news-rail";
import { verifyPreviewToken } from "@/features/publication/preview";
import { getBrandOgImage, sitePageMetadata } from "@/features/seo/site-metadata";
import { siteOrigin } from "@/lib/site-urls";

/**
 * Con un token de vista previa válido para este boxeador se muestra aunque sea borrador (sin caché);
 * en cualquier otro caso, solo si es público ahora. Se comparte entre la página y `generateMetadata`.
 */
const loadFighter = cache(async (slug: string, previewToken: string | undefined) => {
  // La firma y la fecha se revisan antes de leer: un `?preview=` inventado no cuesta una consulta sin caché.
  if (previewToken && verifyPreviewToken(previewToken)) {
    const draft = await getPublicFighterBySlug(db, slug, { preview: true });
    if (draft && verifyPreviewToken(previewToken, { entity: "fighter", id: draft.id })) {
      return { fighter: draft, isPreview: true };
    }
  }
  return { fighter: await getCachedPublicFighter(slug), isPreview: false };
});

function previewParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Las tres cifras del hero (spec §3): victorias por KO/TKO, por decisión y totales del récord profesional en ShowBox; un
 * boxeador que aún no pelea en la promotora muestra Victorias, Derrotas y Empates del récord total (nunca 0-0-0).
 */
function heroFigures(gc: ComputedRecord, manual: ManualRecord) {
  const hasFights = gc.wins + gc.losses + gc.draws + gc.noContests > 0;
  if (hasFights) {
    return [
      { label: "KO/TKO", value: gc.winsBy.koTko, accent: true },
      { label: "Decisión", value: gc.winsBy.decision },
      { label: "Victorias", value: gc.wins },
    ];
  }
  return [
    { label: "Victorias", value: manual.wins, accent: true },
    { label: "Derrotas", value: manual.losses },
    { label: "Empates", value: manual.draws },
  ];
}

export async function generateMetadata({ params, searchParams }: PageProps<"/boxeadores/[slug]">): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { fighter, isPreview } = await loadFighter(slug, previewParam(query.preview));
  if (!fighter) return { title: "Boxeador no encontrado" };

  const name = `${fighter.firstName} ${fighter.lastName}`;
  return sitePageMetadata({
    title: `${name}${fighter.nickname ? ` «${fighter.nickname}»` : ""}`,
    description: `Ficha de ${name}, boxeador de ${divisionTitle(fighter.division)} en ${BRAND.name}: récord, datos y redes.`,
    path: `/boxeadores/${fighter.slug}`,
    noindex: isPreview,
  });
}

export default async function FighterPage({ params, searchParams }: PageProps<"/boxeadores/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { fighter, isPreview } = await loadFighter(slug, previewParam(query.preview));
  if (!fighter) notFound();

  const { proRecord } = fighter;
  const [{ computed, history, nextBout }, news, rankingTags, brandImage] = await Promise.all([
    getCachedFighterBouts(fighter.id),
    getCachedPostsForFighter(fighter.id),
    getCachedFighterRankingTags(fighter.id),
    getBrandOgImage(),
  ]);
  return (
    <>
      {/* Un borrador en vista previa no lleva datos estructurados. */}
      {isPreview ? null : <JsonLd data={fighterJsonLd(fighter, siteOrigin(), brandImage.url)} />}
      <FighterHero fighter={fighter} figures={heroFigures(computed.pro, proRecord)} rankingTags={rankingTags} />
      <NextBout nextBout={nextBout} lastFight={history[0] ?? null} />
      <FighterInfo fighter={fighter} />
      <RecordSummary manual={{ pro: proRecord, amateur: fighter.amateurRecord }} computed={computed} />
      <div data-slot="fighter-history">
        <FightHistory rows={history} />
      </div>
      <FighterGallery media={fighter.gallery} name={`${fighter.firstName} ${fighter.lastName}`} />
      <div data-slot="fighter-news">
        <RelatedNewsRail posts={news} />
      </div>
      {isPreview ? <PreviewBanner /> : null}
    </>
  );
}
