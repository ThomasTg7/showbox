import Link from "next/link";
import { Button } from "@/components/ui-gc/button";
import { formatShortDate, formatTime } from "@/lib/format-date";
import type { EventCardDTO } from "../dto";
import { TicketTiers } from "./ticket-tiers";

/** Entradas de cada próximo evento: tramos con precio, botón a la ticketera y puntos de venta. */
export function TicketsList({ events }: { events: EventCardDTO[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border px-6 py-16 text-center">
        <p className="font-display text-[clamp(26px,4.5vw,40px)] uppercase leading-none text-white">Pronto anunciaremos el próximo evento</p>
        <p className="max-w-md font-cond uppercase tracking-[.06em] text-muted-foreground">Cuando haya fecha, aquí verás los precios y dónde comprar tus entradas.</p>
        <Button variant="ghost" asChild className="mt-2">
          <Link href="/eventos">Ver eventos anteriores</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16">
      {events.map((event) => {
        const start = new Date(event.startsAt);
        const main = event.mainBout;
        const cancelled = event.eventStatus === "cancelled";
        const hasTickets = event.ticketTiers.length > 0 || event.ticketUrl || event.ticketPoints;

        return (
          <section key={event.id} data-event={event.slug} aria-labelledby={`tickets-${event.slug}`} className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2.5 font-cond text-[13px] font-extrabold uppercase tracking-[.2em] sb-gradient-text before:block before:h-[3px] before:w-7 before:bg-brand">
                {formatShortDate(start)} · {formatTime(start)} hrs
              </p>
              <h2 id={`tickets-${event.slug}`} className="font-display text-[clamp(38px,6vw,80px)] uppercase leading-[.9] text-white">
                {event.name}
              </h2>
              {main ? (
                <p className="font-cond text-lg font-bold uppercase tracking-[.06em] text-white">
                  {main.red.lastName} <span className="sb-gradient-text">vs</span> {main.blue.lastName}
                </p>
              ) : null}
              <p className="font-cond text-base font-semibold uppercase tracking-[.06em] text-muted-foreground">
                {event.venueName}, {event.venueCity}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {!cancelled && event.ticketUrl ? (
                  <Button variant="primary" asChild>
                    <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                      Ir a la ticketera <span aria-hidden>→</span>
                      <span className="sr-only"> (se abre en otra pestaña)</span>
                    </a>
                  </Button>
                ) : null}
                <Button variant="ghost" asChild>
                  <Link href={`/eventos/${event.slug}`}>Ver el evento</Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {cancelled ? (
                <p className="border border-border px-5 py-6 font-cond text-lg font-bold uppercase tracking-[.08em] text-white">Este evento fue cancelado.</p>
              ) : hasTickets ? (
                <>
                  <TicketTiers tiers={event.ticketTiers} ticketUrl={event.ticketUrl} eventName={event.name} />
                  {event.ticketPoints ? (
                    <div data-slot="ticket-points">
                      <h3 className="mb-2 font-cond text-[13px] font-extrabold uppercase tracking-[.16em] sb-gradient-text">Puntos de venta</h3>
                      <p className="max-w-prose whitespace-pre-line text-muted-foreground">{event.ticketPoints}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="border border-dashed border-border px-5 py-6 font-cond text-base font-semibold uppercase tracking-[.06em] text-muted-foreground">
                  Pronto publicaremos las entradas de este evento.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
