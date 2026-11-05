import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui-gc/button";
import { getCachedPublicEvents } from "@/features/events/cached-queries";
import { EventCard } from "@/features/events/components/event-card";
import { withEffectiveStatus } from "@/domain/event-night";
import { sitePageMetadata } from "@/features/seo/site-metadata";
import { parsePageParam } from "@/lib/pagination";
import { PageHeader, PageShell } from "@/components/site/page-shell";

export async function generateMetadata({ searchParams }: PageProps<"/eventos">): Promise<Metadata> {
  const page = parsePageParam((await searchParams).pagina);
  return sitePageMetadata({
    title: "Eventos",
    description: `Los próximos eventos de ${BRAND.name} con su cartelera y entradas, y los resultados de las veladas anteriores.`,
    // Las páginas de resultados anteriores son listas distintas: cada una se canoniza a sí misma.
    path: page > 1 ? `/eventos?pagina=${page}` : "/eventos",
  });
}

export default async function EventosPage({ searchParams }: PageProps<"/eventos">) {
  const page = parsePageParam((await searchParams).pagina);
  const [upcomingPage, past] = await Promise.all([getCachedPublicEvents("upcoming", 1), getCachedPublicEvents("past", page)]);
  // A su hora de inicio cada evento se ve «en vivo» aunque nadie lo haya marcado en el panel.
  const now = new Date();
  const upcoming = { ...upcomingPage, items: upcomingPage.items.map((event) => withEffectiveStatus(event, now)) };

  return (
    <PageShell>
      <PageHeader title="Eventos" className="mb-12" />

      <section aria-labelledby="upcoming-title" className="mb-20">
        <h2 id="upcoming-title" className="mb-6 font-display text-[clamp(28px,4vw,44px)] uppercase leading-none text-white">
          Próximos
        </h2>
        {upcoming.items.length > 0 ? (
          <ul className="flex flex-col gap-5">
            {upcoming.items.map((event, index) => (
              <li key={event.id}>
                <EventCard event={event} variant="upcoming" priority={index === 0 && page === 1} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 border border-dashed border-border px-6 py-14 text-center">
            <p className="font-display text-[clamp(26px,4.5vw,40px)] uppercase leading-none text-white">Pronto anunciaremos el próximo evento</p>
            <p className="max-w-md font-cond uppercase tracking-[.06em] text-muted-foreground">Mientras tanto, mira los resultados de las veladas anteriores.</p>
          </div>
        )}
      </section>

      <section id="pasados" aria-labelledby="past-title">
        <h2 id="past-title" className="mb-6 font-display text-[clamp(28px,4vw,44px)] uppercase leading-none text-white">
          Pasados
        </h2>
        {past.items.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.items.map((event) => (
              <li key={event.id}>
                <EventCard event={event} variant="past" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="border border-dashed border-border px-6 py-10 text-center font-cond uppercase tracking-[.06em] text-muted-foreground">
            Todavía no hay eventos pasados. Aquí verás los resultados de cada velada.
          </p>
        )}

        {page > 1 || past.hasMore ? (
          <nav aria-label="Paginación de eventos pasados" className="mt-10 flex items-center justify-between gap-4">
            {page > 1 ? (
              <Button variant="ghost" asChild>
                <Link href={page - 1 === 1 ? "/eventos#pasados" : `/eventos?pagina=${page - 1}#pasados`}>Anterior</Link>
              </Button>
            ) : (
              <span />
            )}
            <span className="font-cond font-bold uppercase tracking-[.1em] text-muted-foreground">Página {page}</span>
            {past.hasMore ? (
              <Button variant="ghost" asChild>
                <Link href={`/eventos?pagina=${page + 1}#pasados`}>Siguiente</Link>
              </Button>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </PageShell>
  );
}
