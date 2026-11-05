import { Calendar, Radio } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/features/events/components/countdown";
import { formatDateTime } from "@/lib/format-date";
import { adminPath } from "@/lib/site-urls";
import type { Dashboard } from "../queries";

/**
 * El próximo evento del Inicio: nombre, fecha, cuántas peleas lleva, cuenta regresiva y el botón «Abrir noche de pelea»
 * (la consola de la noche). Sin evento por delante, un vacío que propone crear el siguiente.
 */
export function NextEventCard({ event }: { event: Dashboard["nextEvent"] }) {
  if (!event) {
    return (
      <section aria-labelledby="next-event-title" className="flex flex-col items-start gap-3 border border-dashed border-border p-5 sm:p-6">
        <h2 id="next-event-title" className="text-lg font-semibold">
          Próximo evento
        </h2>
        <p className="max-w-prose text-muted-foreground">No hay ningún evento por delante. Crea el siguiente para armar su cartelera y publicarlo.</p>
        <Button asChild>
          <Link href={adminPath("/eventos/nuevo")}>Crear un evento</Link>
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="next-event-title" data-slot="next-event" className="sb-admin-section flex flex-col gap-4 border-t-2 border-t-brand p-5 sm:p-6">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar aria-hidden className="size-4" /> Próximo evento
        </p>
        <h2 id="next-event-title" className="font-cond text-3xl font-bold break-words">
          {event.name}
        </h2>
        <p className="mt-1 text-muted-foreground">
          {formatDateTime(event.startsAt)} · {event.boutsCount === 1 ? "1 pelea" : `${event.boutsCount} peleas`}
        </p>
      </div>
      <Countdown target={event.startsAt.toISOString()} className="justify-start" />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild size="lg" className="sm:min-w-56">
          <Link href={adminPath(`/eventos/${event.id}/en-vivo`)}>
            <Radio aria-hidden /> Abrir noche de pelea
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={adminPath(`/eventos/${event.id}/cartelera`)}>Armar la cartelera</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={adminPath(`/eventos/${event.id}`)}>Editar el evento</Link>
        </Button>
      </div>
    </section>
  );
}
