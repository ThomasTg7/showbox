import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { withEffectiveStatus } from "@/domain/event-night";
import { HOME_TITLE, organizationJsonLd, websiteJsonLd } from "@/domain/seo";
import { formatShortDate } from "@/lib/format-date";
import { EventStickyBar } from "@/features/events/components/event-sticky-bar";
import { EVENT_HERO_ID } from "@/features/events/components/event-hero";
import { getHomeTicketOffer } from "@/features/home/home-ticket-offer";
import { getCachedLatestTicketEvent } from "@/features/events/cached-queries";
import { siteOrigin } from "@/lib/site-urls";
import { pickMainBout } from "@/features/events/main-bout";
import { getHomeData } from "@/features/home/cached-queries";
import { DontMissRail } from "@/features/home/components/dont-miss-rail";
import { FightersPin } from "@/features/home/components/fighters-pin";
import { HomeCardSummary } from "@/features/home/components/home-card-summary";
import { HomeHero } from "@/features/home/components/home-hero";
import { HomeNews } from "@/features/home/components/home-news";
import { IntroLoader } from "@/features/home/components/intro-loader";
import { Marquee } from "@/features/home/components/marquee";
import { RankingsPreview } from "@/features/home/components/rankings-preview";
import { StatsBand } from "@/features/home/components/stats-band";
import { TicketsCta } from "@/features/home/components/tickets-cta";
import type { HomeHero as HomeHeroDTO } from "@/features/home/dto";
import { sitePageMetadata } from "@/features/seo/site-metadata";
import { getCachedSetting } from "@/features/settings/cached-queries";
import { SponsorStrip } from "@/features/sponsors/components/sponsor-strip";

// Solo lecturas cacheadas (sin `searchParams` ni `headers()`): la home sigue siendo estática.
export function generateMetadata(): Promise<Metadata> {
  return sitePageMetadata({
    title: { absolute: HOME_TITLE },
    description: `${BRAND.name}, la promotora de boxeo de Ecuador: próximo evento, cartelera, boxeadores, rankings, noticias y entradas.`,
    path: "/",
  });
}

/** Los textos de la cinta amarilla: el evento, la fecha, el recinto y, si ya se juega, el combate estelar. */
function marqueeItems(hero: HomeHeroDTO): string[] {
  if (hero.kind === "brand") return [];
  const { event } = hero;
  const main = pickMainBout(event.segments.flatMap((segment) => segment.bouts), (bout) => bout.status === "cancelled");
  const items = [event.name, formatShortDate(new Date(event.startsAt)), event.venue.name];
  if (hero.kind === "next-event" && (event.ticketTiers.length > 0 || event.ticketUrl)) items.push("Entradas a la venta");
  if (main) items.push(`${main.red.lastName} vs ${main.blue.lastName}`);
  return items;
}

export default async function HomePage() {
  const [home, socials, contact, ticketEvent] = await Promise.all([getHomeData(), getCachedSetting("socials"), getCachedSetting("contact"), getCachedLatestTicketEvent()]);
  // A su hora de inicio el evento de la portada se ve «en vivo» solo (la home se regenera cada 5 min como máximo).
  const hero = home.hero.kind === "brand" ? home.hero : { ...home.hero, event: withEffectiveStatus(home.hero.event, new Date()) };
  const siteUrl = siteOrigin();
  const ticketOffer = getHomeTicketOffer(ticketEvent ? { kind: "next-event", event: ticketEvent } : { kind: "brand" });

  return (
    <>
      <JsonLd data={organizationJsonLd({ socials, contact, logoUrl: `${siteUrl}/logo.png` }, siteUrl)} />
      <JsonLd data={websiteJsonLd(siteUrl)} />
      <IntroLoader />
      <ScrollReveal />
      <HomeHero hero={hero} />
      {ticketOffer ? <EventStickyBar {...ticketOffer} heroId={EVENT_HERO_ID} /> : null}
      <Marquee items={marqueeItems(hero)} />
      {hero.kind !== "brand" ? <HomeCardSummary event={hero.event} rankLabels={hero.rankLabels} kind={hero.kind} /> : null}
      <HomeNews news={home.news} />
      <DontMissRail posts={home.dontMiss} />
      <FightersPin fighters={home.fighters} />
      {home.stats.events > 0 ? <StatsBand stats={home.stats} /> : null}
      <RankingsPreview rankings={home.rankings} />
      {hero.kind === "next-event" ? <TicketsCta event={hero.event} /> : null}
      <SponsorStrip sponsors={home.sponsors} />
    </>
  );
}
