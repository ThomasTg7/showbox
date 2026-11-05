import Link from "next/link";
import { SectionHeading } from "@/components/ui-gc/section-heading";
import { BoutAccordion } from "@/features/events/components/bout-accordion";
import { BoutRow } from "@/features/events/components/bout-row";
import { EventSchedule } from "@/features/events/components/event-schedule";
import { FightCardTabs } from "@/features/events/components/fight-card-tabs";
import { WatchEventButton } from "@/features/events/components/watch-event-button";
import type { HomeEvent } from "../dto";

type HomeCardSummaryProps = HomeEvent & { kind: "next-event" | "last-event" };

/**
 * La cartelera del evento de la portada, resumida (maqueta): pestañas por bloque con cada pelea, horarios y recinto. Es la
 * misma cartelera de la página del evento (las peleas se abren con su frente a frente); el «Ver evento» lleva a ella. Un
 * evento sin peleas todavía dice que se anunciará.
 */
export function HomeCardSummary({ event, rankLabels, kind }: HomeCardSummaryProps) {
  const segments = event.segments.filter((segment) => segment.bouts.length > 0);
  const isLast = kind === "last-event";

  return (
    <section id="cartelera" aria-labelledby="home-card-title" className="bg-white py-[clamp(72px,10vw,140px)] text-black">
      <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)]">
        <div data-reveal>
          <SectionHeading
            kicker={isLast ? "Último evento" : "Próximo evento"}
            title={
              <span id="home-card-title">
                {isLast ? "Resultados" : "Cartelera"}
                <br />
                {event.name}
              </span>
            }
            tone="light"
            action={
              <div className="flex flex-wrap items-center gap-4">
                <Link href={`/eventos/${event.slug}`} className="inline-flex min-h-11 items-center border-b-2 border-brand pb-1 font-cond text-sm font-extrabold uppercase tracking-[.1em] text-black">
                  Ver evento <span aria-hidden>→</span>
                </Link>
                <WatchEventButton eventName={event.name} platforms={event.watchPlatforms} />
              </div>
            }
          />
        </div>
        {segments.length > 0 ? (
          <BoutAccordion>
            <FightCardTabs
              segments={segments.map((segment) => ({
                id: segment.id,
                name: segment.name,
                content: segment.bouts.map((bout) => <BoutRow key={bout.id} bout={bout} eventSlug={event.slug} rankLabels={rankLabels} />),
              }))}
            />
          </BoutAccordion>
        ) : (
          <p className="border border-dashed border-neutral-300 px-6 py-12 text-center font-cond text-lg font-semibold uppercase tracking-[.06em] text-neutral-600">Pronto anunciaremos la cartelera de {event.name}.</p>
        )}
        <EventSchedule event={event} />
      </div>
    </section>
  );
}
