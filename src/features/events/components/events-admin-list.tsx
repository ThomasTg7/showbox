import { MediaImage } from "@/components/media/media-image";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EVENT_STATUS_LABELS } from "@/domain/bout-enums";
import { PublicationBadge } from "@/features/publication/components/publication-badge";
import { formatDateTime } from "@/lib/format-date";
import type { AdminEventRow } from "../dto";
import { EventRowActions } from "./event-row-actions";

function Poster({ event }: { event: AdminEventRow }) {
  return (
    <div className="h-16 w-12 shrink-0 overflow-hidden bg-muted">
      {event.posterMedia ? <MediaImage media={event.posterMedia} sizes="48px" className="size-full object-cover" /> : <div className="size-full" aria-hidden />}
    </div>
  );
}

function Details({ event }: { event: AdminEventRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-medium break-words">{event.name}</span>
      <span className="text-sm text-muted-foreground">
        {formatDateTime(event.startsAt)} · {event.venueCity}
      </span>
    </div>
  );
}

/** «Programado» es lo normal y no se destaca; en vivo, finalizado y cancelado sí. */
function EventStatusBadge({ status }: { status: AdminEventRow["eventStatus"] }) {
  if (status === "scheduled") return null;
  return <Badge variant={status === "live" ? "default" : "outline"}>{EVENT_STATUS_LABELS[status]}</Badge>;
}

const boutsLabel = (count: number) => (count === 1 ? "1 pelea" : `${count} peleas`);

export function EventsAdminList({ events, hasFilters }: { events: AdminEventRow[]; hasFilters: boolean }) {
  if (events.length === 0) {
    return (
      <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
        {hasFilters ? "Ningún evento coincide con ese filtro." : "Todavía no hay eventos. Crea el primero con «Nuevo evento»."}
      </p>
    );
  }

  return (
    <>
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>Cartelera</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Poster event={event} />
                  <Details event={event} />
                </div>
              </TableCell>
              <TableCell>{boutsLabel(event.boutCount)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <PublicationBadge status={event.status} publishAt={event.publishAt} />
                  <EventStatusBadge status={event.eventStatus} />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <EventRowActions id={event.id} name={event.name} status={event.status} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ul className="flex flex-col gap-3 sm:hidden">
        {events.map((event) => (
          <li key={event.id} className="flex flex-col gap-3 border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Poster event={event} />
              <Details event={event} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{boutsLabel(event.boutCount)}</span>
              <PublicationBadge status={event.status} publishAt={event.publishAt} />
              <EventStatusBadge status={event.eventStatus} />
            </div>
            <EventRowActions id={event.id} name={event.name} status={event.status} />
          </li>
        ))}
      </ul>
    </>
  );
}
