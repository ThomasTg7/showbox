import { ArenaBackdrop } from "@/components/brand/arena-backdrop";
import { BRAND } from "@/domain/brand";
import Link from "next/link";
import { MediaImage } from "@/components/media/media-image";
import { Tag } from "@/components/ui-gc/tag";
import { AutoFitText } from "@/components/ui-gc/auto-fit-text";
import { EVENT_STATUS_LABELS } from "@/domain/bout-enums";
import { formatShortDate, formatTime } from "@/lib/format-date";
import type { EventCardDTO } from "../dto";
import { boutMeasure } from "../public-format";
import { EventActions } from "./event-actions";

export const EVENT_CARD_SIZES = "(min-width: 1024px) 320px, (min-width: 640px) 40vw, 92vw";

type EventCardProps = {
  event: EventCardDTO;
  /** Los próximos van en una fila grande, con el botón de entradas; los pasados, en tarjetas compactas. */
  variant: "upcoming" | "past";
  priority?: boolean;
};

function Poster({ event, priority }: { event: EventCardDTO; priority: boolean }) {
  const image = event.posterMedia ?? event.heroMobileMedia ?? event.heroMedia;
  return (
    <div className="relative isolate aspect-[4/5] w-full overflow-hidden bg-black">
      {image ? (
        <MediaImage media={image} sizes={EVENT_CARD_SIZES} priority={priority} className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-sb motion-safe:group-hover:scale-105" />
      ) : (
        <div aria-hidden className="absolute inset-0 grid place-items-center">
          <ArenaBackdrop />
          <span className="font-display text-[clamp(120px,22vw,220px)] leading-none text-transparent [-webkit-text-stroke:2px_rgba(255,59,71,.45)]">{event.number ?? BRAND.shortName}</span>
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
    </div>
  );
}

/** Event information and three independent actions; no stretched link can cover the controls. */
export function EventCard({ event, variant, priority = false }: EventCardProps) {
  const start = new Date(event.startsAt);
  const main = event.mainBout;
  const upcoming = variant === "upcoming";
  const status = event.eventStatus === "scheduled" || event.eventStatus === "completed" ? null : event.eventStatus;
  const measure = main ? boutMeasure(main) : "";

  return (
    <article
      data-event={event.slug}
      className={`group relative overflow-hidden border border-border bg-[linear-gradient(170deg,#1c1c1c,#0a0a0a_70%)] transition-opacity duration-300 focus-within:border-brand hover:border-brand ${
        upcoming ? "grid sm:grid-cols-[minmax(200px,320px)_1fr]" : "flex flex-col"
      }`}
    >
      <Poster event={event} priority={priority} />
      <div className="flex flex-col gap-3 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          {event.number !== null ? <Tag tone="brand">{BRAND.name} {event.number}</Tag> : null}
          {status ? <Tag tone={status === "live" ? "red" : "outline"}>{status === "live" ? "● En vivo" : EVENT_STATUS_LABELS[status]}</Tag> : null}
          {main?.isTitleFight ? <Tag tone="outline">Pelea por el título</Tag> : null}
        </div>
        <h3 className={`font-display uppercase leading-[.95] text-white ${upcoming ? "text-[clamp(30px,5vw,56px)]" : "text-[clamp(26px,4vw,34px)]"}`}>
          <Link href={`/eventos/${event.slug}`}>
            {event.name}
          </Link>
        </h3>
        <p className="font-cond text-[15px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
          {formatShortDate(start)} · <span className="font-bold sb-gradient-text">{formatTime(start)} hrs</span> · {event.venueName}, {event.venueCity}
        </p>
        {main ? (
          <p className="font-cond text-base font-bold uppercase tracking-[.06em] text-white">
            <AutoFitText>{main.red.lastName} <span className="sb-gradient-text">vs</span> {main.blue.lastName}
            {measure ? <span className="font-semibold text-muted-foreground"> · {measure}</span> : null}</AutoFitText>
          </p>
        ) : (
          <p className="font-cond text-base font-semibold uppercase tracking-[.06em] text-muted-foreground">Cartelera por anunciar</p>
        )}
        {event.eventStatus !== "cancelled" ? <EventActions eventName={event.name} detailsHref={`/eventos/${event.slug}`} ticketHref={upcoming ? event.ticketUrl ?? undefined : undefined} ticketExternal platforms={event.watchPlatforms} className="mt-auto pt-3" /> : null}
      </div>
    </article>
  );
}
