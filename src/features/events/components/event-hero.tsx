import { CoverMarker } from "@/components/site/cover-marker";
import { Logo } from "@/components/brand/logo";
import { Tag } from "@/components/ui-gc/tag";
import { AutoFitText } from "@/components/ui-gc/auto-fit-text";
import { formatPosterDate, formatTime } from "@/lib/format-date";
import type { EventPageDTO } from "../dto";
import { pickMainBout } from "../main-bout";
import { eventStatusTag } from "../public-format";
import { Countdown } from "./countdown";
import { EventHeroArt } from "./event-hero-art";
import { EventActions } from "./event-actions";

export const EVENT_HERO_ID = "event-hero";
type EventHeroProps = { event: EventPageDTO; ticketHref?: string; ticketExternal?: boolean; showCountdown: boolean };

/** Full-width photography with centered event billing and actions. */
export function EventHero({ event, ticketHref, ticketExternal = false, showCountdown }: EventHeroProps) {
  const main = pickMainBout(event.segments.flatMap((segment) => segment.bouts), (bout) => bout.status === "cancelled");
  const start = new Date(event.startsAt);
  const status = eventStatusTag(event.eventStatus);
  return (
    <section id={EVENT_HERO_ID} data-mobile-cover={Boolean(event.heroMobileMedia)} aria-labelledby="event-title" className="sb-hero relative isolate flex min-h-[max(760px,100svh)] items-end overflow-hidden pt-24 text-center lg:min-h-[max(850px,100svh)]">
      <EventHeroArt event={event} main={main} />
      <CoverMarker />
      <div className="sb-hero-content relative z-[4] mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] pb-12 pt-56 lg:pb-12 lg:pt-40">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-6 hidden justify-center lg:flex"><Logo size="md" /></div>
          <div className="sb-hero-billing mb-5 flex flex-wrap items-center justify-center gap-2">
            <Tag tone="ember">{event.name}</Tag><Tag tone={status.tone}>{status.label}</Tag>
          </div>
          <h1 id="event-title" className="sb-hero-matchup sb-punch-in font-display text-[clamp(36px,7.4vw,96px)] uppercase leading-[.98] tracking-[-.025em] text-white [overflow-wrap:anywhere] drop-shadow-[0_6px_24px_rgba(0,0,0,.65)] lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-x-6">
            {main ? <><span data-slot="hero-red" className="sb-chrome-text block min-w-0 max-w-full"><AutoFitText minFontSize={24}>{main.red.lastName}</AutoFitText></span><span className="my-2 block font-cond text-[.3em] font-bold tracking-[.12em] sb-gradient-text">VS</span><span data-slot="hero-blue" className="sb-chrome-text block min-w-0 max-w-full"><AutoFitText minFontSize={24}>{main.blue.lastName}</AutoFitText></span></> : event.name}
          </h1>
          <div aria-hidden className="sb-hero-rule mx-auto mt-7" />
          <p className="sb-hero-date sb-poster-date mt-5 text-[clamp(26px,4.4vw,46px)] leading-none text-white">
            {formatPosterDate(start)}
            <span className="ml-3 align-middle font-cond text-[.45em] not-italic tracking-[.12em] text-accent-bright [font-variation-settings:'wdth'_90,'wght'_800]">{formatTime(start)} HRS</span>
          </p>
          <p className="sb-hero-venue sb-spaced mt-3 text-[11px] text-white/80 sm:text-xs">{event.venue.name}{event.venue.city ? ` · ${event.venue.city}` : ""}</p>
          {showCountdown ? <Countdown target={event.startsAt} className="sb-hero-countdown my-6 justify-center" /> : <div className="h-6" />}
          <EventActions layout="hero" eventName={event.name} detailsHref="#cartelera" detailsLabel={event.eventStatus === "completed" ? "Ver resultados" : "Ver cartelera completa"} ticketHref={ticketHref} ticketExternal={ticketExternal}
            platforms={event.watchPlatforms ?? (event.streamUrl ? [{ name: "Transmisión oficial", url: event.streamUrl, media: null }] : [])} className="mx-auto max-w-[480px]" />
        </div>
      </div>
    </section>
  );
}
