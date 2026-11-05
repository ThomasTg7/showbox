import { describe, expect, it } from "vitest";
import type { EventPageDTO } from "@/features/events/dto";
import type { FighterProfileDTO } from "@/features/fighters/dto";
import type { MediaDTO } from "@/features/media/dto";
import type { PostDTO } from "@/features/posts/dto";
import {
  articleJsonLd,
  eventJsonLd,
  fighterJsonLd,
  ogImage,
  organizationJsonLd,
  pageMetadata,
  serializeJsonLd,
  truncateDescription,
  websiteJsonLd,
} from "./seo";

const SITE = "https://openfightlatam.cl";
const FALLBACK = `${SITE}/og-default.jpg`;

function media(overrides: Partial<MediaDTO> = {}): MediaDTO {
  return {
    id: "m1",
    kind: "news_cover",
    width: 3200,
    height: 1800,
    focal: { x: 0.5, y: 0.5 },
    alt: "",
    variants: [
      { width: 400, height: 225, url: "/media/c-400.webp" },
      { width: 800, height: 450, url: "/media/c-800.webp" },
      { width: 1600, height: 900, url: "/media/c-1600.webp" },
    ],
    originalUrl: "/media/c-original.png",
    ...overrides,
  };
}

function fighter(overrides: Partial<FighterProfileDTO> = {}): FighterProfileDTO {
  return {
    id: "f1",
    slug: "bryan-cevallos",
    firstName: "Bryan",
    lastName: "Cevallos",
    nickname: "El Martillo",
    gender: "male",
    nationality: "CL",
    careerStatus: "active",
    division: { name: "Ligero", slug: "ligero", limitKg: 70, gender: "male" },
    record: { wins: 10, losses: 2, draws: 0, noContests: 0 },
    bodyMedia: null,
    birthDate: "1995-03-01",
    hometown: "Rancagua",
    weightKg: 70,
    heightCm: 178,
    reachCm: 180,
    stance: "orthodox",
    gym: null,
    coach: null,
    baseDiscipline: null,
    bio: null,
    socials: { instagram: "@elToro", tiktok: "", youtube: "nombre con espacios" },
    proRecord: { wins: 10, losses: 2, draws: 0, noContests: 0 },
    amateurRecord: { wins: 0, losses: 0, draws: 0, noContests: 0 },
    headshotMedia: null,
    gallery: [],
    ...overrides,
  };
}

function boutFighter(slug: string, firstName: string, lastName: string, isPublic = true) {
  return {
    id: slug,
    slug,
    firstName,
    lastName,
    nickname: null,
    nationality: "CL",
    isPublic,
    record: { wins: 0, losses: 0, draws: 0, noContests: 0 },
    heightCm: null,
    weightKg: null,
    reachCm: null,
    headshotMedia: null,
    bodyMedia: null,
  };
}

function bout(status: "scheduled" | "cancelled", red: ReturnType<typeof boutFighter>, blue: ReturnType<typeof boutFighter>) {
  return {
    id: `${red.slug}-${blue.slug}`,
    level: "pro" as const,
    scheduledRounds: 3,
    roundSeconds: 300,
    isTitleFight: false,
    status,
    cancelReason: null,
    division: null,
    catchweightKg: null,
    red,
    blue,
    result: null,
  };
}

function event(overrides: Partial<EventPageDTO> = {}): EventPageDTO {
  return {
    id: "e1",
    slug: "showbox-fight-night-12",
    name: "ShowBox Fight Night 12",
    number: 12,
    startsAt: "2031-05-11T01:00:00.000Z",
    eventStatus: "scheduled",
    ticketUrl: "https://tickets.example/gc12",
    ticketTiers: [
      { name: "General", description: "Galería", priceClp: 15000, soldOut: false },
      { name: "VIP", description: "Ringside", priceClp: 60000, soldOut: true },
    ],
    ticketPoints: null,
    heroMedia: media({ kind: "event_hero", variants: [{ width: 1920, height: 1080, url: "/media/h-1920.webp" }] }),
    heroMobileMedia: null,
    posterMedia: null,
    doorsAt: null,
    endsEstimatedAt: "2031-05-11T04:30:00.000Z",
    venue: { name: "Gimnasio Municipal", address: "Av. España 123", city: "Rancagua", lat: -34.17, lng: -70.74 },
    ticketProvider: null,
    streamUrl: null,
    gallery: [],
    segments: [
      {
        id: "s1",
        name: "Estelar",
        startsAt: null,
        bouts: [
          bout("cancelled", boutFighter("a-a", "Ana", "Arias"), boutFighter("b-b", "Beto", "Bravo")),
          bout("scheduled", boutFighter("bryan-cevallos", "Bryan", "Cevallos"), boutFighter("juan-quinonez", "Juan", "Quiñónez", false)),
        ],
      },
    ],
    ...overrides,
  };
}

function post(overrides: Partial<PostDTO> = {}): PostDTO {
  return {
    id: "p1",
    slug: "pérez-gana",
    title: 'Cevallos gana por "sumisión"',
    excerpt: "Crónica de la noche.",
    category: { slug: "resultados", name: "Resultados" },
    featured: false,
    date: "2031-05-11T05:00:00.000Z",
    updatedAt: "2031-05-12T10:00:00.000Z",
    cover: media(),
    body: { type: "doc", content: [] },
    gallery: [],
    bodyMedia: {},
    fighters: [{ id: "f1", slug: "bryan-cevallos", firstName: "Bryan", lastName: "Cevallos", nickname: null, nationality: "CL", headshotMedia: null, bodyMedia: null }],
    events: [],
    ...overrides,
  };
}

describe("truncateDescription", () => {
  it("leaves a short text as it is, with single spaces", () => {
    expect(truncateDescription("Hola   mundo\n  de MMA")).toBe("Hola mundo de MMA");
  });

  it("cuts on a whole word, adds the ellipsis and never passes the limit", () => {
    const text = `${"palabra ".repeat(40)}final`;
    const result = truncateDescription(text, 160);
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith("…")).toBe(true);
    expect(result.slice(0, -1).split(" ").every((word) => word === "palabra")).toBe(true);
  });

  it("does not leave a comma or period before the ellipsis", () => {
    expect(truncateDescription("uno, dos, tres, cuatro", 12)).toBe("uno, dos…");
  });

  it("hard-cuts a single word longer than the limit", () => {
    const result = truncateDescription("x".repeat(300), 160);
    expect(result).toHaveLength(160);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("pageMetadata", () => {
  const base = { title: "Boxeadores", description: "Todos los boxeadores.", path: "/boxeadores", ogImage: { url: FALLBACK, width: 1200, height: 630 } };

  it("gives title (the layout adds the suffix), canonical, Open Graph and Twitter card", () => {
    const meta = pageMetadata(base);
    expect(meta.title).toBe("Boxeadores");
    expect(meta.description).toBe("Todos los boxeadores.");
    expect(meta.alternates?.canonical).toBe("/boxeadores");
    expect(meta.openGraph).toMatchObject({
      title: "Boxeadores | ShowBox Promotions",
      description: "Todos los boxeadores.",
      url: "/boxeadores",
      siteName: "ShowBox Promotions",
      locale: "es_EC",
      type: "website",
      images: [{ url: FALLBACK, width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "Boxeadores | ShowBox Promotions", images: [FALLBACK] });
    expect(meta.robots).toBeUndefined();
  });

  it("keeps an absolute title as it is (home)", () => {
    const meta = pageMetadata({ ...base, title: { absolute: "ShowBox Promotions — MMA" }, path: "/" });
    expect(meta.title).toEqual({ absolute: "ShowBox Promotions — MMA" });
    expect(meta.openGraph).toMatchObject({ title: "ShowBox Promotions — MMA" });
  });

  it("truncates a long description to 160 characters", () => {
    const meta = pageMetadata({ ...base, description: "palabra ".repeat(60) });
    expect((meta.description ?? "").length).toBeLessThanOrEqual(160);
    expect(meta.openGraph?.description).toBe(meta.description);
  });

  it("marks noindex pages", () => {
    expect(pageMetadata({ ...base, noindex: true }).robots).toEqual({ index: false, follow: false });
  });

  it("describes an article for Open Graph", () => {
    const meta = pageMetadata({ ...base, article: { publishedTime: "2031-05-11T05:00:00.000Z", section: "Resultados" } });
    expect(meta.openGraph).toMatchObject({ type: "article", publishedTime: "2031-05-11T05:00:00.000Z", section: "Resultados" });
  });
});

describe("ogImage", () => {
  it("uses the variant of the asked width as an absolute URL, with its size", () => {
    expect(ogImage(media(), SITE, 1600)).toEqual({ url: `${SITE}/media/c-1600.webp`, width: 1600, height: 900 });
  });

  it("takes the closest larger variant, or the largest when none is big enough", () => {
    expect(ogImage(media(), SITE, 700).url).toBe(`${SITE}/media/c-800.webp`);
    expect(ogImage(media(), SITE, 4000).url).toBe(`${SITE}/media/c-1600.webp`);
  });

  it("keeps an absolute storage URL (R2) untouched", () => {
    const remote = media({ variants: [{ width: 1200, height: 630, url: "https://media.openfightlatam.cl/x-1200.webp" }] });
    expect(ogImage(remote, SITE, 1200).url).toBe("https://media.openfightlatam.cl/x-1200.webp");
  });

  it("falls back to the brand image when there is no media", () => {
    expect(ogImage(null, SITE)).toEqual({ url: FALLBACK, width: 1200, height: 630 });
  });

  it("falls back to the original when the image has no variants (SVG)", () => {
    expect(ogImage(media({ variants: [] }), SITE).url).toBe(`${SITE}/media/c-original.png`);
  });
});

describe("eventJsonLd", () => {
  it("describes the event with name, address, organizer and the Ecuador offset on the start date", () => {
    const data = eventJsonLd(event(), SITE, FALLBACK);
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: "ShowBox Fight Night 12",
      url: `${SITE}/eventos/showbox-fight-night-12`,
      startDate: "2031-05-10T20:00:00-05:00",
      endDate: "2031-05-10T23:30:00-05:00",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      organizer: { "@type": "Organization", name: "ShowBox Promotions" },
      location: {
        "@type": "Place",
        name: "Gimnasio Municipal",
        address: { "@type": "PostalAddress", streetAddress: "Av. España 123", addressLocality: "Rancagua", addressCountry: "EC" },
        geo: { "@type": "GeoCoordinates", latitude: -34.17, longitude: -70.74 },
      },
    });
    expect(data.image).toEqual([`${SITE}/media/h-1920.webp`]);
  });

  it("marks a cancelled event as cancelled", () => {
    expect(eventJsonLd(event({ eventStatus: "cancelled" }), SITE, FALLBACK).eventStatus).toBe("https://schema.org/EventCancelled");
  });

  it("keeps a finished event as scheduled and sells nothing", () => {
    const data = eventJsonLd(event({ eventStatus: "completed" }), SITE, FALLBACK);
    expect(data.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(data.offers).toBeUndefined();
  });

  it("lists each ticket tier in CLP, sold out ones as SoldOut", () => {
    const data = eventJsonLd(event(), SITE, FALLBACK);
    expect(data.offers).toEqual([
      expect.objectContaining({ "@type": "Offer", name: "General", price: 15000, priceCurrency: "CLP", availability: "https://schema.org/InStock", url: "https://tickets.example/gc12" }),
      expect.objectContaining({ name: "VIP", price: 60000, availability: "https://schema.org/SoldOut" }),
    ]);
  });

  it("sends tiers without a ticket link to the tickets page", () => {
    const data = eventJsonLd(event({ ticketUrl: null }), SITE, FALLBACK);
    expect(data.offers).toEqual(expect.arrayContaining([expect.objectContaining({ url: `${SITE}/entradas` })]));
  });

  it("omits the offers without tiers, the end date without an estimate and the geo without coordinates", () => {
    const data = eventJsonLd(event({ ticketTiers: [], endsEstimatedAt: null, venue: { name: "Sala", address: "", city: "Rancagua", lat: null, lng: null } }), SITE, FALLBACK);
    expect(data.offers).toBeUndefined();
    expect(data.endDate).toBeUndefined();
    expect(JSON.stringify(data.location)).not.toContain("geo");
  });

  it("names the competitors of the main bout (the first one not cancelled) and links the public ones only", () => {
    const data = eventJsonLd(event(), SITE, FALLBACK);
    expect(data.competitor).toEqual([
      { "@type": "Person", name: "Bryan Cevallos", url: `${SITE}/boxeadores/bryan-cevallos` },
      { "@type": "Person", name: "Juan Quiñónez" },
    ]);
    // Google (resultados enriquecidos de eventos) lee `performer`, no `competitor`.
    expect(data.performer).toEqual(data.competitor);
  });

  it("uses the brand image when the event has no photo", () => {
    expect(eventJsonLd(event({ heroMedia: null }), SITE, FALLBACK).image).toEqual([FALLBACK]);
  });
});

describe("fighterJsonLd", () => {
  it("describes the fighter with nickname, country name, measures and the links of his networks", () => {
    const data = fighterJsonLd(fighter({ headshotMedia: media({ kind: "fighter_headshot", variants: [{ width: 800, height: 800, url: "/media/h-800.webp" }] }) }), SITE, FALLBACK);
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Bryan Cevallos",
      alternateName: "El Martillo",
      url: `${SITE}/boxeadores/bryan-cevallos`,
      nationality: { "@type": "Country", name: "Chile" },
      height: { "@type": "QuantitativeValue", value: 178, unitCode: "CMT" },
      weight: { "@type": "QuantitativeValue", value: 70, unitCode: "KGM" },
      image: `${SITE}/media/h-800.webp`,
      sameAs: ["https://www.instagram.com/elToro"],
    });
  });

  it("leaves out what the fighter does not have", () => {
    const data = fighterJsonLd(fighter({ nickname: null, heightCm: null, weightKg: null, socials: {} }), SITE, FALLBACK);
    for (const key of ["alternateName", "height", "weight", "sameAs"]) expect(data).not.toHaveProperty(key);
    expect(data.image).toBe(FALLBACK);
  });

  it("produces valid JSON for a nickname with quotes, accents and a script tag", () => {
    const tricky = fighter({ firstName: "Bryan", lastName: 'Cevallos "El Martillo"', nickname: '"Toro" </script><b>' });
    const json = serializeJsonLd(fighterJsonLd(tricky, SITE, FALLBACK));
    expect(json).not.toContain("</script>");
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('Bryan Cevallos "El Martillo"');
    expect(parsed.alternateName).toBe('"Toro" </script><b>');
  });
});

describe("articleJsonLd", () => {
  it("describes the news with its dates, section, cover and related fighters", () => {
    const data = articleJsonLd(post(), SITE, FALLBACK);
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: 'Cevallos gana por "sumisión"',
      description: "Crónica de la noche.",
      datePublished: "2031-05-11T05:00:00.000Z",
      dateModified: "2031-05-12T10:00:00.000Z",
      articleSection: "Resultados",
      image: [`${SITE}/media/c-1600.webp`],
      author: { "@type": "Organization", name: "ShowBox Promotions" },
      publisher: { "@type": "Organization", name: "ShowBox Promotions" },
      mainEntityOfPage: `${SITE}/noticias/p%C3%A9rez-gana`,
      about: [{ "@type": "Person", name: "Bryan Cevallos", url: `${SITE}/boxeadores/bryan-cevallos` }],
    });
  });

  it("uses the brand image without a cover and leaves out what is empty", () => {
    const data = articleJsonLd(post({ cover: null, excerpt: null, fighters: [] }), SITE, FALLBACK);
    expect(data.image).toEqual([FALLBACK]);
    expect(data).not.toHaveProperty("description");
    expect(data).not.toHaveProperty("about");
  });
});

describe("organizationJsonLd and websiteJsonLd", () => {
  const socials = { instagram: "@openfightlatam", tiktok: "", youtube: "", facebook: "https://facebook.com/gc", x: "" };

  it("lists the usable social profiles and the contact that has a value", () => {
    const data = organizationJsonLd(
      { socials, contact: { email: "hola@openfightlatam.cl", phone: "", whatsapp: "", address: "", notifyEmail: "" }, logoUrl: `${SITE}/logo.png` },
      SITE,
    );
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ShowBox Promotions",
      url: SITE,
      logo: `${SITE}/logo.png`,
      sameAs: ["https://www.instagram.com/openfightlatam", "https://facebook.com/gc"],
      email: "hola@openfightlatam.cl",
    });
    expect(data).not.toHaveProperty("telephone");
  });

  it("leaves out sameAs and contact when nothing is configured", () => {
    const empty = { instagram: "", tiktok: "", youtube: "", facebook: "", x: "" };
    const data = organizationJsonLd({ socials: empty, contact: { email: "", phone: "+593 99 123 4567", whatsapp: "", address: "", notifyEmail: "" }, logoUrl: `${SITE}/logo.png` }, SITE);
    expect(data).not.toHaveProperty("sameAs");
    expect(data).not.toHaveProperty("email");
    expect(data).toMatchObject({ telephone: "+593 99 123 4567" });
  });

  it("describes the website in es-EC", () => {
    expect(websiteJsonLd(SITE)).toEqual({ "@context": "https://schema.org", "@type": "WebSite", name: "ShowBox Promotions", url: SITE, inLanguage: "es-EC" });
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so the data can never close the script tag", () => {
    const json = serializeJsonLd({ "@context": "https://schema.org", "@type": "Thing", name: "</script><script>alert(1)</script>" } as never);
    expect(json).not.toContain("<");
    expect(JSON.parse(json).name).toBe("</script><script>alert(1)</script>");
  });
});
