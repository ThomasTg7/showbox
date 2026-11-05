import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import Link from "next/link";
import type { BoutLevel } from "@/domain/bout-enums";
import { getCachedPublicRankings } from "@/features/rankings/cached-queries";
import { RankingCard } from "@/features/rankings/components/ranking-card";
import { parseRankingLevel, rankingsHref } from "@/features/rankings/public-level";
import { sitePageMetadata } from "@/features/seo/site-metadata";
import { formatDate } from "@/lib/format-date";
import { PageHeader, PageShell } from "@/components/site/page-shell";

export async function generateMetadata({ searchParams }: PageProps<"/rankings">): Promise<Metadata> {
  const level = parseRankingLevel((await searchParams).nivel);
  const { cards } = await getCachedPublicRankings(level);
  return sitePageMetadata({
    title: level === "amateur" ? "Rankings amateur" : "Rankings",
    description:
      level === "amateur"
        ? `Los rankings amateur de ${BRAND.name}: libra por libra y por división.`
        : `Campeones y rankings de ${BRAND.name}: libra por libra y por división, profesional y amateur.`,
    // El amateur es otra página (otro contenido): su canónica lleva el nivel; cualquier otro valor cae en `/rankings`.
    path: rankingsHref(level),
    // Sin tarjetas (nivel oculto o aún sin armar) es un «Pronto…»: no se indexa, igual que en el sitemap.
    noindex: cards.length === 0,
  });
}

const LEVELS: { level: BoutLevel; label: string }[] = [
  { level: "pro", label: "Pro" },
  { level: "amateur", label: "Amateur" },
];

export default async function RankingsPage({ searchParams }: PageProps<"/rankings">) {
  const level = parseRankingLevel((await searchParams).nivel);
  const { cards } = await getCachedPublicRankings(level);
  const updated = cards.flatMap((card) => (card.updatedAt ? [card.updatedAt] : [])).sort().at(-1);

  return (
    <PageShell>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <PageHeader title="Rankings" kicker="Campeones y clasificación" className="">
          {updated ? <p className="mt-4 font-cond text-sm font-semibold uppercase tracking-[.1em] text-muted-foreground">Actualizado {formatDate(new Date(updated))}</p> : null}
        </PageHeader>
        <nav aria-label="Nivel" className="inline-flex border-2 border-border">
          {LEVELS.map((option) => (
            <Link
              key={option.level}
              href={rankingsHref(option.level)}
              aria-current={option.level === level ? "page" : undefined}
              className={`inline-flex min-h-11 items-center px-5 font-cond text-sm font-extrabold uppercase tracking-[.1em] outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent-bright ${
                option.level === level ? "bg-brand text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      {cards.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <RankingCard key={card.division?.id ?? "p4p"} {...card} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 border border-dashed border-border px-6 py-16 text-center">
          <p className="font-display text-[clamp(28px,5vw,44px)] uppercase leading-none text-white">Pronto publicaremos los rankings</p>
          <p className="max-w-md font-cond uppercase tracking-[.06em] text-muted-foreground">Estamos preparando la clasificación {level === "pro" ? "profesional" : "amateur"}. Vuelve pronto.</p>
        </div>
      )}
    </PageShell>
  );
}
