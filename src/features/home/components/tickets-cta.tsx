import Link from "next/link";
import { Button } from "@/components/ui-gc/button";
import type { EventPageDTO } from "@/features/events/dto";
import { TicketTiers } from "@/features/events/components/ticket-tiers";
import { formatShortDate } from "@/lib/format-date";
import { ArenaBackdrop } from "@/components/brand/arena-backdrop";
import { BrandMark } from "@/components/brand/brand-mark";

/**
 * Entradas del próximo evento y acceso a la ticketera oficial.
 * Sin tramos ni ticketera no hay nada que ofrecer: la sección no se dibuja (las entradas siguen en `/entradas`).
 */
export function TicketsCta({ event }: { event: EventPageDTO }) {
  const hasTiers = event.ticketTiers.length > 0;
  if (!hasTiers && !event.ticketUrl) return null;

  return (
    <section id="entradas" aria-labelledby="home-tickets-title" className="relative isolate overflow-hidden border-y border-border bg-surface py-[clamp(72px,10vw,140px)]">
      <ArenaBackdrop lights={false} />
      <BrandMark className="absolute -right-20 top-0 -z-10 h-full opacity-60" />
      <div className="mx-auto grid w-full max-w-[1320px] items-center gap-10 px-[clamp(16px,4vw,64px)] lg:grid-cols-2 lg:gap-10">
        <div data-reveal>
          <p className="mb-3.5 flex items-center gap-2.5 font-cond text-[13px] font-extrabold uppercase tracking-[.32em] text-accent-bright before:block before:h-[4px] before:w-8 before:-skew-x-[20deg] before:bg-brand-bright">
            {event.name} · {formatShortDate(new Date(event.startsAt))}
          </p>
          <h2 id="home-tickets-title" className="font-display text-[clamp(44px,6.6vw,96px)] uppercase leading-[.9] text-white">
            Vive la
            <br />
            <span className="text-accent-bright">velada</span>
          </h2>
          <p className="my-5 max-w-[44ch] text-[17px] text-muted-foreground">
            {event.ticketUrl ? "Entradas a la venta en nuestra ticketera oficial." : "Los precios de cada tramo están abajo."}
            {event.ticketPoints ? " También en puntos de venta físicos." : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            {event.ticketUrl ? (
              <Button variant="primary" asChild>
                <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                  Ir a la ticketera <span aria-hidden>↗</span>
                </a>
              </Button>
            ) : null}
            <Button variant="ghost" asChild>
              <Link href="/entradas">Ver precios y puntos de venta</Link>
            </Button>
          </div>
        </div>
        {hasTiers ? (
          <div data-reveal className="w-full min-w-0">
            <TicketTiers tiers={event.ticketTiers} ticketUrl={event.ticketUrl} eventName={event.name} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
