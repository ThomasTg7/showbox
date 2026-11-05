import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import type { NewsArticle, Offer, Organization, Person, SportsEvent, Thing, WebSite, WithContext } from "schema-dts";
import { pickMainBout } from "@/features/events/main-bout";
import type { BoutFighterDTO, EventPageDTO } from "@/features/events/dto";
import type { FighterProfileDTO } from "@/features/fighters/dto";
import type { MediaDTO } from "@/features/media/dto";
import type { PostDTO } from "@/features/posts/dto";
import { socialLinks } from "@/features/settings/social-links";
import type { SettingValue } from "@/features/settings/registry";
import { toLocalIso } from "@/lib/local-time";
import { socialUrl, type SocialNetwork } from "./socials";
import { countryName } from "./units";

// Metadatos y datos estructurados (JSON-LD) del sitio. Todo es puro: recibe lo que ya leyó la página y devuelve datos.

export const SITE_NAME = BRAND.name;
/** La plantilla del título del sitio: el layout la aplica a cada `title` (las páginas escriben solo su nombre). */
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;
export const HOME_TITLE = `${SITE_NAME} — Boxeo`;
export const DESCRIPTION_MAX = 160;

/** Imagen de marca de reserva (1200×630) para lo que no tiene una propia; vive en `public/`. */
export const DEFAULT_OG_PATH = "/og-default.jpg";
const DEFAULT_OG_SIZE = { width: 1200, height: 630 };

const SCHEMA_ORG = "https://schema.org";

/** Una descripción para buscadores y redes: sin saltos de línea, de hasta `max` caracteres, cortada en palabra completa. */
export function truncateDescription(text: string, max: number = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  // Deja un lugar para «…»; si el corte cae dentro de una palabra, retrocede hasta el último espacio.
  const head = clean.slice(0, max - 1);
  const cutInsideWord = !/\s/.test(clean.charAt(max - 1));
  const lastSpace = head.lastIndexOf(" ");
  const words = cutInsideWord && lastSpace > 0 ? head.slice(0, lastSpace) : head;
  return `${words.replace(/[\s,;:.\-–—]+$/, "")}…`;
}

export type OgImage = { url: string; width?: number; height?: number };

export function absoluteUrl(url: string, siteUrl: string): string {
  return new URL(url, siteUrl).href;
}

/**
 * La variante de una imagen para compartir, con URL absoluta (las redes no resuelven rutas relativas): la más chica que
 * llega a `width` o, si ninguna llega, la más grande. Sin imagen, la de marca (`public/og-default.jpg`).
 */
export function ogImage(media: MediaDTO | null, siteUrl: string, width: number = DEFAULT_OG_SIZE.width): OgImage {
  if (!media) return { url: absoluteUrl(DEFAULT_OG_PATH, siteUrl), ...DEFAULT_OG_SIZE };
  const sorted = [...media.variants].sort((a, b) => a.width - b.width);
  const variant = sorted.find((item) => item.width >= width) ?? sorted.at(-1);
  if (!variant) return { url: absoluteUrl(media.originalUrl, siteUrl) };
  const height = variant.height ?? (media.width > 0 ? Math.round((variant.width * media.height) / media.width) : undefined);
  return { url: absoluteUrl(variant.url, siteUrl), width: variant.width, ...(height ? { height } : {}) };
}

export type PageMetadataInput = {
  /** Sin el sufijo de marca (lo pone la plantilla del layout); `{ absolute }` lo deja tal cual (home). */
  title: string | { absolute: string };
  description: string;
  /** Ruta canónica sin dominio (`/boxeadores`); el layout fija `metadataBase`. */
  path: string;
  ogImage: OgImage;
  noindex?: boolean;
  /** Una noticia: `og:type=article` con su fecha y sección. */
  article?: { publishedTime: string; modifiedTime?: string; section: string };
};

export function pageMetadata(input: PageMetadataInput): Metadata {
  const description = truncateDescription(input.description);
  const fullTitle = typeof input.title === "string" ? TITLE_TEMPLATE.replace("%s", input.title) : input.title.absolute;
  const { url, width, height } = input.ogImage;

  return {
    title: input.title,
    description,
    alternates: { canonical: input.path },
    openGraph: {
      title: fullTitle,
      description,
      url: input.path,
      siteName: SITE_NAME,
      locale: "es_EC",
      images: [{ url, ...(width ? { width } : {}), ...(height ? { height } : {}) }],
      ...(input.article ? { type: "article" as const, ...input.article } : { type: "website" as const }),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [url] },
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

// --- JSON-LD ---

/** schema-dts permite también un texto en cada tipo (una referencia); aquí siempre se arma el objeto. */
type Node<T> = Exclude<T, string>;
type JsonLd<T extends Thing> = WithContext<Node<T>>;

/** El JSON de un `<script type="application/ld+json">`: `<` escapado para que nada cierre la etiqueta antes de tiempo. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function brand(siteUrl: string): Node<Organization> {
  return { "@type": "Organization", name: SITE_NAME, url: siteUrl };
}

function personRef(fighter: Pick<BoutFighterDTO, "slug" | "firstName" | "lastName" | "isPublic">, siteUrl: string): Node<Person> {
  return {
    "@type": "Person",
    name: `${fighter.firstName} ${fighter.lastName}`,
    ...(fighter.isPublic ? { url: `${siteUrl}/boxeadores/${fighter.slug}` } : {}),
  };
}

export function eventJsonLd(e: EventPageDTO, siteUrl: string, fallbackImageUrl?: string): JsonLd<SportsEvent> {
  const eventUrl = `${siteUrl}/eventos/${e.slug}`;
  const isOver = e.eventStatus === "completed" || e.eventStatus === "cancelled";
  const main = pickMainBout(e.segments.flatMap((segment) => segment.bouts), (bout) => bout.status === "cancelled");
  // `competitor` es lo propio de schema.org para un `SportsEvent`; Google (resultados de eventos) lee `performer`.
  const fighters = main ? [personRef(main.red, siteUrl), personRef(main.blue, siteUrl)] : [];
  const images = [e.heroMedia, e.posterMedia].flatMap((media) => (media ? [ogImage(media, siteUrl, 1920).url] : []));
  if (images.length === 0 && fallbackImageUrl) images.push(fallbackImageUrl);

  // Con el evento terminado o cancelado la página no vende entradas: el JSON-LD tampoco las ofrece.
  const offers: Offer[] = isOver
    ? []
    : e.ticketTiers.map((tier) => ({
        "@type": "Offer",
        name: tier.name,
        ...(tier.description ? { description: tier.description } : {}),
        price: tier.priceClp,
        priceCurrency: "CLP",
        availability: tier.soldOut ? `${SCHEMA_ORG}/SoldOut` : `${SCHEMA_ORG}/InStock`,
        url: e.ticketUrl ?? `${siteUrl}/entradas`,
      }));

  return {
    "@context": SCHEMA_ORG,
    "@type": "SportsEvent",
    name: e.name,
    url: eventUrl,
    startDate: toLocalIso(new Date(e.startsAt)),
    ...(e.endsEstimatedAt ? { endDate: toLocalIso(new Date(e.endsEstimatedAt)) } : {}),
    eventStatus: e.eventStatus === "cancelled" ? `${SCHEMA_ORG}/EventCancelled` : `${SCHEMA_ORG}/EventScheduled`,
    eventAttendanceMode: `${SCHEMA_ORG}/OfflineEventAttendanceMode`,
    location: {
      "@type": "Place",
      name: e.venue.name,
      address: {
        "@type": "PostalAddress",
        ...(e.venue.address ? { streetAddress: e.venue.address } : {}),
        addressLocality: e.venue.city,
        addressCountry: "EC",
      },
      ...(e.venue.lat !== null && e.venue.lng !== null ? { geo: { "@type": "GeoCoordinates", latitude: e.venue.lat, longitude: e.venue.lng } } : {}),
    },
    ...(images.length > 0 ? { image: images } : {}),
    organizer: brand(siteUrl),
    ...(offers.length > 0 ? { offers } : {}),
    ...(fighters.length > 0 ? { competitor: fighters, performer: fighters } : {}),
  };
}

const FIGHTER_NETWORKS: SocialNetwork[] = ["instagram", "tiktok", "youtube", "x"];

export function fighterJsonLd(f: FighterProfileDTO, siteUrl: string, fallbackImageUrl?: string): JsonLd<Person> {
  const image = f.headshotMedia ?? f.bodyMedia;
  const sameAs = FIGHTER_NETWORKS.flatMap((network) => {
    const href = socialUrl(network, f.socials[network] ?? "");
    return href ? [href] : [];
  });

  return {
    "@context": SCHEMA_ORG,
    "@type": "Person",
    name: `${f.firstName} ${f.lastName}`,
    ...(f.nickname ? { alternateName: f.nickname } : {}),
    url: `${siteUrl}/boxeadores/${f.slug}`,
    nationality: { "@type": "Country", name: countryName(f.nationality) },
    ...(f.heightCm ? { height: { "@type": "QuantitativeValue", value: f.heightCm, unitCode: "CMT" } } : {}),
    ...(f.weightKg ? { weight: { "@type": "QuantitativeValue", value: f.weightKg, unitCode: "KGM" } } : {}),
    ...(image ? { image: ogImage(image, siteUrl, 800).url } : fallbackImageUrl ? { image: fallbackImageUrl } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function articleJsonLd(p: PostDTO, siteUrl: string, fallbackImageUrl?: string): JsonLd<NewsArticle> {
  const image = p.cover ? ogImage(p.cover, siteUrl, 1600).url : fallbackImageUrl;
  return {
    "@context": SCHEMA_ORG,
    "@type": "NewsArticle",
    headline: p.title,
    ...(p.excerpt ? { description: p.excerpt } : {}),
    datePublished: p.date,
    dateModified: p.updatedAt,
    ...(image ? { image: [image] } : {}),
    articleSection: p.category.name,
    author: brand(siteUrl),
    publisher: brand(siteUrl),
    mainEntityOfPage: `${siteUrl}/noticias/${encodeURIComponent(p.slug)}`,
    ...(p.fighters.length > 0 ? { about: p.fighters.map((fighter) => personRef({ ...fighter, isPublic: true }, siteUrl)) } : {}),
  };
}

export function organizationJsonLd(
  input: { socials: SettingValue<"socials">; contact: SettingValue<"contact">; logoUrl: string },
  siteUrl: string,
): JsonLd<Organization> {
  const sameAs = socialLinks(input.socials).map((link) => link.href);
  return {
    "@context": SCHEMA_ORG,
    ...brand(siteUrl),
    logo: input.logoUrl,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(input.contact.email ? { email: input.contact.email } : {}),
    ...(input.contact.phone ? { telephone: input.contact.phone } : {}),
  };
}

export function websiteJsonLd(siteUrl: string): JsonLd<WebSite> {
  return { "@context": SCHEMA_ORG, "@type": "WebSite", name: SITE_NAME, url: siteUrl, inLanguage: "es-EC" };
}
