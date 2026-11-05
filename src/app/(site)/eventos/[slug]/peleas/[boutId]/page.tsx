import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { SectionHeading } from "@/components/ui-gc/section-heading";
import { boutHref, findEventBout } from "@/features/events/bout-lookup";
import { getCachedPublicEvent } from "@/features/events/cached-queries";
import { BoutComparison } from "@/features/events/components/bout-comparison";
import { BoutDetailCorner } from "@/features/events/components/bout-detail/bout-detail-corner";
import { BoutResultSummary } from "@/features/events/components/bout-detail/bout-result-summary";
import { JudgesScorecards } from "@/features/events/components/judges-scorecards";
import { boutMeasure, roundsLabel } from "@/features/events/public-format";
import { getCachedBoutRankLabels } from "@/features/rankings/cached-queries";
import { sitePageMetadata } from "@/features/seo/site-metadata";
import { formatShortDate } from "@/lib/format-date";

const boutIdSchema = z.uuid();

/** El evento público y la pelea pedida; `null` si no existe o no es de ese evento. Lo comparten la página y los metadatos. */
const loadBout = cache(async (slug: string, boutId: string) => {
  if (!boutIdSchema.safeParse(boutId).success) return null;
  const event = await getCachedPublicEvent(slug);
  const found = event ? findEventBout(event, boutId) : null;
  return event && found ? { event, ...found } : null;
});

export async function generateMetadata({ params }: PageProps<"/eventos/[slug]/peleas/[boutId]">): Promise<Metadata> {
  const { slug, boutId } = await params;
  const loaded = await loadBout(slug, boutId);
  if (!loaded) return { title: "Pelea no encontrada" };
  const { event, bout } = loaded;
  const versus = `${bout.red.firstName} ${bout.red.lastName} vs ${bout.blue.firstName} ${bout.blue.lastName}`;
  return sitePageMetadata({
    title: `${bout.red.lastName} vs ${bout.blue.lastName} · ${event.name}`,
    description: bout.result ? `${versus} en ${event.name}: ${bout.result.line}. Resultado, árbitro y tarjetas de los jueces.` : `${versus} en ${event.name}: datos de los dos boxeadores.`,
    path: boutHref(event.slug, bout.id),
  });
}

export default async function BoutPage({ params }: PageProps<"/eventos/[slug]/peleas/[boutId]">) {
  const { slug, boutId } = await params;
  const loaded = await loadBout(slug, boutId);
  if (!loaded) notFound();
  const { event, bout, segmentName } = loaded;

  // Mismas etiquetas (y la misma caché) que la cartelera del evento.
  const rankLabels = await getCachedBoutRankLabels(
    event.id,
    event.segments.filter((segment) => segment.bouts.length > 0).flatMap((segment) => segment.bouts.map((candidate) => candidate.id)),
  );
  const { result } = bout;
  const winner = result?.outcome === "red_win" ? "red" : result?.outcome === "blue_win" ? "blue" : null;
  const gender = bout.division?.gender ?? "male";
  const measure = boutMeasure(bout);

  return (
    <>
      <header className="bg-black px-[clamp(16px,4vw,64px)] pb-10 pt-[calc(76px+clamp(24px,5vw,56px))]">
        <div className="mx-auto w-full max-w-[1100px]">
          <Link href={`/eventos/${event.slug}#cartelera`} className="font-cond text-sm font-bold uppercase tracking-[.1em] sb-gradient-text underline-offset-4 hover:underline">
            ← {event.name} · Cartelera
          </Link>
          <p className="mt-6 font-cond text-[13px] font-extrabold uppercase tracking-[.2em] text-muted-foreground">
            {segmentName} · {formatShortDate(new Date(event.startsAt))}
          </p>
          <h1 className="mt-2 font-display text-[clamp(30px,8.5vw,88px)] uppercase leading-[.9] text-white">
            {bout.red.lastName} <span className="sb-gradient-text">vs</span> {bout.blue.lastName}
          </h1>
          <p className="mt-3 flex flex-wrap gap-x-3 font-cond text-sm font-semibold uppercase tracking-[.1em] text-white/80">
            {measure ? <span>{measure}</span> : null}
            <span>{roundsLabel(bout)}</span>
            {bout.level === "amateur" ? <span>Amateur</span> : null}
            {bout.isTitleFight ? <span className="sb-gradient-text">★ Pelea por el título</span> : null}
          </p>
        </div>
      </header>

      <div className="bg-white py-[clamp(40px,7vw,96px)] text-black">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-[clamp(40px,7vw,80px)] px-[clamp(16px,4vw,64px)]">
          <section aria-label="Los boxeadores" className="grid grid-cols-2 items-start gap-4 sm:gap-10">
            <BoutDetailCorner fighter={bout.red} side="red" won={winner === "red"} rankLabel={rankLabels[bout.red.id]} gender={gender} />
            <BoutDetailCorner fighter={bout.blue} side="blue" won={winner === "blue"} rankLabel={rankLabels[bout.blue.id]} gender={gender} />
          </section>

          <BoutResultSummary bout={bout} />

          <section aria-labelledby="comparison-title">
            <SectionHeading kicker="Frente a frente" title={<span id="comparison-title">Datos</span>} tone="light" />
            <BoutComparison bout={bout} />
          </section>

          {result?.scorecards?.length ? (
            <section aria-labelledby="scorecards-title">
              <SectionHeading kicker="Jueces" title={<span id="scorecards-title">Tarjetas de los jueces</span>} tone="light" />
              <JudgesScorecards bout={bout} scorecards={result.scorecards} />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
