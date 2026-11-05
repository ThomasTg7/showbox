import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui-gc/button";
import { countryName } from "@/domain/units";
import { FighterCard } from "@/features/fighters/components/fighter-card";
import { FighterFilters } from "@/features/fighters/components/fighter-filters";
import { getCachedPublicFighters, getCachedPublicFilterOptions } from "@/features/fighters/cached-queries";
import { fightersCanonicalPath, fightersHref, isFilteredList, parsePublicFilters } from "@/features/fighters/public-filters";
import { getCachedChampionBadges } from "@/features/rankings/cached-queries";
import { sitePageMetadata } from "@/features/seo/site-metadata";
import { PageHeader, PageShell } from "@/components/site/page-shell";

export async function generateMetadata({ searchParams }: PageProps<"/boxeadores">): Promise<Metadata> {
  const { filters, page } = parsePublicFilters(await searchParams);
  return sitePageMetadata({
    title: "Boxeadores",
    description: `Todo el plantel de ${BRAND.name}: busca por nombre o apodo y filtra por división, país y estado.`,
    path: fightersCanonicalPath(filters, page),
    // Cada búsqueda de texto es una página distinta que nadie debería encontrar en Google.
    noindex: Boolean(filters.q),
  });
}

/** Pantallas de la primera fila: 2 columnas en celular, 3 en tablet, 4 en escritorio. */
const FIRST_ROW = 4;

export default async function BoxeadoresPage({ searchParams }: PageProps<"/boxeadores">) {
  const { filters, page } = parsePublicFilters(await searchParams);
  const [{ items, hasMore }, options, championBadges] = await Promise.all([getCachedPublicFighters(filters, page), getCachedPublicFilterOptions(), getCachedChampionBadges()]);

  const countries = options.nationalities.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const isFiltered = isFilteredList(filters);

  return (
    <PageShell>
      <PageHeader title="Boxeadores" kicker="El plantel" className="mb-10" />

      <div className="mb-10">
        <FighterFilters filters={filters} divisions={options.divisions} countries={countries} />
      </div>

      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {items.map((fighter, index) => (
            <li key={fighter.id}>
              <FighterCard fighter={fighter} priority={index < FIRST_ROW && page === 1} badge={championBadges[fighter.id]} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-5 border border-dashed border-border px-6 py-16 text-center">
          <p className="font-display text-[clamp(28px,5vw,44px)] uppercase leading-none text-white">
            {isFiltered ? "Sin resultados" : "Pronto presentaremos al plantel"}
          </p>
          <p className="max-w-md font-cond uppercase tracking-[.06em] text-muted-foreground">
            {isFiltered ? "No encontramos boxeadores con esos filtros. Prueba con otra búsqueda." : "Estamos preparando las fichas de nuestros boxeadores. Vuelve pronto."}
          </p>
          {isFiltered ? (
            <Button variant="primary" asChild>
              <Link href="/boxeadores">Ver todos los boxeadores</Link>
            </Button>
          ) : null}
        </div>
      )}

      {page > 1 || hasMore ? (
        <nav aria-label="Paginación" className="mt-10 flex items-center justify-between gap-4">
          {page > 1 ? (
            <Button variant="ghost" asChild>
              <Link href={fightersHref(filters, page - 1)}>Anterior</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="font-cond font-bold uppercase tracking-[.1em] text-muted-foreground">Página {page}</span>
          {hasMore ? (
            <Button variant="ghost" asChild>
              <Link href={fightersHref(filters, page + 1)}>Siguiente</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </PageShell>
  );
}
