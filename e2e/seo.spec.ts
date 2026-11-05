import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { events } from "@/db/schema/events";
import { createFighter } from "@/features/fighters/service";
import { insertMedia } from "@/features/fighters/test-helpers";
import { insertPost } from "@/features/posts/test-helpers";
import { createPreviewToken } from "@/features/publication/preview";
import { adminUrl } from "./fixtures/admin";
import { createE2eCard } from "./fixtures/events";

// Metadatos y datos estructurados de cada página pública. Lo que depende de Configuración (verificación de Google, redes,
// páginas fijas sin texto) vive en `static-pages.spec.ts`, que es quien cambia esa configuración en orden.

const SITE = process.env.SITE_URL ?? "http://localhost:3100";
const BRAND_IMAGE = `${SITE}/og-default.jpg`;

const head = {
  title: (page: Page) => page.title(),
  description: (page: Page) => page.locator('meta[name="description"]').first().getAttribute("content"),
  canonical: (page: Page) => page.locator('link[rel="canonical"]').first().getAttribute("href"),
  property: (page: Page, name: string) => page.locator(`meta[property="${name}"]`).first().getAttribute("content"),
  robots: (page: Page) => page.locator('meta[name="robots"]'),
};

async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts.first()).toBeAttached();
  return (await scripts.allTextContents()).map((text) => JSON.parse(text));
}

const FIXED_PAGES = [
  { path: "/eventos", title: "Eventos | ShowBox Promotions" },
  { path: "/boxeadores", title: "Boxeadores | ShowBox Promotions" },
  { path: "/rankings", title: "Rankings | ShowBox Promotions" },
  { path: "/noticias", title: "Noticias | ShowBox Promotions" },
  { path: "/entradas", title: "Entradas | ShowBox Promotions" },
  { path: "/quiero-pelear", title: "Quiero pelear | ShowBox Promotions" },
  { path: "/patrocinar", title: "Patrocinar | ShowBox Promotions" },
  { path: "/nosotros", title: "Nosotros | ShowBox Promotions" },
  { path: "/contacto", title: "Contacto | ShowBox Promotions" },
  { path: "/privacidad", title: "Política de privacidad | ShowBox Promotions" },
];

test("la home tiene su título, canónica, imagen para compartir y los datos de la promotora", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CL");
  expect(await head.title(page)).toBe("ShowBox Promotions — MMA");
  // Next escribe la raíz sin la barra final: es la misma URL.
  expect(await head.canonical(page)).toBe(SITE);
  expect(await head.property(page, "og:title")).toBe("ShowBox Promotions — MMA");
  expect(await head.property(page, "og:image")).toBe(BRAND_IMAGE);
  await expect(head.robots(page)).toHaveCount(0);

  const data = await jsonLd(page);
  const organization = data.find((item) => item["@type"] === "Organization");
  expect(organization).toMatchObject({ name: "ShowBox Promotions", url: SITE });
  expect(data.find((item) => item["@type"] === "WebSite")).toMatchObject({ name: "ShowBox Promotions", inLanguage: "es-CL" });
});

for (const { path, title } of FIXED_PAGES) {
  test(`${path} tiene título con plantilla, descripción, canónica sin parámetros e imagen para compartir`, async ({ page }) => {
    await page.goto(path);
    expect(await head.title(page)).toBe(title);
    const description = await head.description(page);
    expect(description).toBeTruthy();
    expect(description!.length).toBeLessThanOrEqual(160);
    expect(await head.canonical(page)).toBe(`${SITE}${path}`);
    expect(await head.property(page, "og:title")).toBe(title);
    expect(await head.property(page, "og:image")).toBe(BRAND_IMAGE);
  });
}

test("cada página fija tiene un título distinto", async ({ page }) => {
  const titles: string[] = [];
  for (const { path } of FIXED_PAGES) {
    await page.goto(path);
    titles.push(await head.title(page));
  }
  expect(new Set(titles).size).toBe(titles.length);
});

test("el listado de boxeadores canoniza sus filtros y marca la búsqueda como noindex", async ({ page }) => {
  await page.goto("/boxeadores?division=peso-superligero&pais=CL");
  expect(await head.canonical(page)).toBe(`${SITE}/boxeadores`);
  await expect(head.robots(page)).toHaveCount(0);

  await page.goto("/boxeadores?q=cevallos");
  expect(await head.canonical(page)).toBe(`${SITE}/boxeadores`);
  await expect(head.robots(page)).toHaveAttribute("content", /noindex/);
});

test("el ranking amateur es otra página con su propia canónica y título", async ({ page }) => {
  await page.goto("/rankings?nivel=amateur");
  expect(await head.title(page)).toBe("Rankings amateur | ShowBox Promotions");
  expect(await head.canonical(page)).toBe(`${SITE}/rankings?nivel=amateur`);

  await page.goto("/rankings?nivel=inventado&otro=1");
  expect(await head.title(page)).toBe("Rankings | ShowBox Promotions");
  expect(await head.canonical(page)).toBe(`${SITE}/rankings`);
});

test("el listado de noticias es autocanónico solo con una categoría que existe y una página válida", async ({ page }) => {
  await page.goto("/noticias?categoria=resultados");
  expect(await head.title(page)).toBe("Resultados · Noticias | ShowBox Promotions");
  expect(await head.canonical(page)).toBe(`${SITE}/noticias?categoria=resultados`);

  await page.goto("/noticias?pagina=2");
  expect(await head.canonical(page)).toBe(`${SITE}/noticias?pagina=2`);

  await page.goto("/noticias?categoria=inventada&pagina=1&utm_source=x");
  expect(await head.title(page)).toBe("Noticias | ShowBox Promotions");
  expect(await head.canonical(page)).toBe(`${SITE}/noticias`);
});

test("la ficha de un boxeador lleva su JSON-LD de Person y no se indexa en vista previa", async ({ page }) => {
  await page.goto("/boxeadores/bryan-cevallos");
  expect(await head.title(page)).toBe("Bryan Cevallos «El Martillo» | ShowBox Promotions");
  expect(await head.canonical(page)).toBe(`${SITE}/boxeadores/bryan-cevallos`);
  await expect(head.robots(page)).toHaveCount(0);

  const person = (await jsonLd(page)).find((item) => item["@type"] === "Person");
  expect(person).toMatchObject({ name: "Bryan Cevallos", alternateName: "El Martillo", url: `${SITE}/boxeadores/bryan-cevallos`, nationality: { name: "Chile" } });
});

test("un nombre con comillas y una etiqueta de cierre se escapa en las etiquetas y en el JSON-LD", async ({ page }) => {
  const [ligero] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.slug, "peso-superligero"));
  const nickname = 'El "Toro" </script><b>';
  const { slug } = await createFighter(db, { firstName: "Bryan", lastName: "Cevallos Comillas", nickname, gender: "male", nationality: "CL", divisionId: ligero!.id, status: "published" }, "e2e");

  await page.goto(`/boxeadores/${slug}`);
  expect(await head.title(page)).toBe(`Bryan Cevallos Comillas «${nickname}» | ShowBox Promotions`);
  expect(await head.property(page, "og:title")).toBe(`Bryan Cevallos Comillas «${nickname}» | ShowBox Promotions`);
  const person = (await jsonLd(page)).find((item) => item["@type"] === "Person");
  expect(person).toMatchObject({ name: "Bryan Cevallos Comillas", alternateName: nickname });
});

test("la vista previa de un borrador lleva noindex y ningún dato estructurado", async ({ page }) => {
  const [ligero] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.slug, "peso-superligero"));
  const draft = await createFighter(db, { firstName: "Seo", lastName: "Borrador", gender: "male", nationality: "CL", divisionId: ligero!.id }, "e2e");

  // Sin enlace de vista previa, un borrador no existe para el público (ni sus datos estructurados).
  await page.goto(`/boxeadores/${draft.slug}`);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);

  await page.goto(`/boxeadores/${draft.slug}?preview=${createPreviewToken("fighter", draft.id)}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(head.robots(page)).toHaveAttribute("content", /noindex/);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test("un evento próximo lleva SportsEvent con su fecha en hora de Chile, lugar y entradas en CLP", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-5");
  expect(await head.canonical(page)).toBe(`${SITE}/eventos/showbox-fight-night-5`);
  expect(await head.title(page)).toMatch(/^ShowBox Fight Night 5 \| ShowBox Promotions$/);

  const event = (await jsonLd(page)).find((item) => item["@type"] === "SportsEvent");
  expect(event).toMatchObject({
    name: "ShowBox Fight Night 5",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: { name: "ShowBox Promotions" },
    location: { "@type": "Place" },
  });
  expect(event!.startDate).toMatch(/T\d\d:\d\d:\d\d-0[34]:00$/);
  const offers = event!.offers as { priceCurrency: string; availability: string }[];
  expect(offers.length).toBeGreaterThan(0);
  expect(offers.every((offer) => offer.priceCurrency === "CLP")).toBe(true);
});

test("un evento ya jugado sigue indexable; uno cancelado lo dice en su JSON-LD", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-4");
  expect(await head.canonical(page)).toBe(`${SITE}/eventos/showbox-fight-night-4`);
  await expect(head.robots(page)).toHaveCount(0);
  expect((await jsonLd(page)).find((item) => item["@type"] === "SportsEvent")).toBeTruthy();

  const card = await createE2eCard("Evento E2E SEO Cancelado", { "Cartelera estelar": [["uno", "dos"]] });
  await db.update(events).set({ eventStatus: "cancelled" }).where(eq(events.id, card.eventId));
  await page.goto(`/eventos/${card.slug}`);
  const cancelled = (await jsonLd(page)).find((item) => item["@type"] === "SportsEvent");
  expect(cancelled).toMatchObject({ eventStatus: "https://schema.org/EventCancelled" });
  await expect(head.robots(page)).toHaveCount(0);
});

test("una noticia lleva NewsArticle con su fecha y sección, y og:type article", async ({ page }) => {
  await page.goto("/noticias/cevallos-defiende-el-cinturon-ante-quinonez");
  expect(await head.property(page, "og:type")).toBe("article");
  expect(await head.property(page, "article:section")).toBe("Anuncios");
  expect(await head.property(page, "article:published_time")).toBeTruthy();
  // Sin portada, la imagen de marca.
  expect(await head.property(page, "og:image")).toBe(BRAND_IMAGE);

  const article = (await jsonLd(page)).find((item) => item["@type"] === "NewsArticle");
  expect(article).toMatchObject({ headline: "Cevallos defiende el cinturón ante Quiñónez", articleSection: "Anuncios", author: { name: "ShowBox Promotions" } });
  expect(typeof article!.datePublished).toBe("string");
  expect(typeof article!.dateModified).toBe("string");
});

test("una noticia con portada usa su portada (variante de 1600 px) como imagen para compartir", async ({ page }) => {
  const coverId = await insertMedia(db, "news_cover", {
    width: 3200,
    height: 1800,
    variants: [
      { width: 800, height: 450, key: "e2e-seo/cover-800.webp" },
      { width: 1600, height: 900, key: "e2e-seo/cover-1600.webp" },
    ],
  });
  const { slug } = await insertPost(db, { slug: "noticia-e2e-con-portada", title: 'Bryan "El Martillo" Cevallos gana por nocaut', coverMediaId: coverId });

  await page.goto(`/noticias/${slug}`);
  expect(await head.title(page)).toBe('Bryan "El Martillo" Cevallos gana por nocaut | ShowBox Promotions');
  const image = await head.property(page, "og:image");
  expect(image).toContain("/media/e2e-seo/cover-1600.webp");
  expect(image!.startsWith("http")).toBe(true);
  expect(await head.property(page, "og:image:width")).toBe("1600");
  expect(await head.property(page, "og:image:height")).toBe("900");

  const article = (await jsonLd(page)).find((item) => item["@type"] === "NewsArticle");
  expect(article!.headline).toBe('Bryan "El Martillo" Cevallos gana por nocaut');
  expect(article!.image).toEqual([image]);
});

test("un borrador de noticia no se ve por su URL ni lleva datos estructurados; su vista previa va con noindex", async ({ page }) => {
  const { id, slug } = await insertPost(db, { slug: "noticia-e2e-borrador-seo", title: "Borrador SEO", status: "draft" });

  await page.goto(`/noticias/${slug}`);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await expect(page.getByText("Borrador SEO")).toHaveCount(0);

  await page.goto(`/noticias/${slug}?preview=${createPreviewToken("post", id)}`);
  await expect(page.getByRole("heading", { name: "Borrador SEO", level: 1 })).toBeVisible();
  await expect(head.robots(page)).toHaveAttribute("content", /noindex/);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test("robots.txt del sitio deja pasar a los buscadores salvo /admin y /api, y apunta al sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const lines = (await response.text()).split(/\r?\n/);
  expect(lines).toContain("User-Agent: *");
  expect(lines).toContain("Disallow: /admin");
  expect(lines).toContain("Disallow: /api");
  expect(lines).not.toContain("Disallow: /");
  expect(lines).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});

// El navegador resuelve *.localhost solo; el cliente HTTP de Node no.
test("robots.txt del panel lo cierra por completo", async ({ page }) => {
  const response = await page.goto(adminUrl("/robots.txt"));
  expect(response!.status()).toBe(200);
  const lines = (await response!.text()).split(/\r?\n/);
  expect(lines).toContain("Disallow: /");
  expect(lines.some((line) => line.startsWith("Sitemap:"))).toBe(false);
});

test("sitemap.xml lista lo público y deja fuera borradores y papelera", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("xml");
  const xml = await response.text();
  for (const path of ["", "/eventos", "/boxeadores", "/noticias", "/entradas", "/quiero-pelear", "/patrocinar", "/rankings", "/boxeadores/bryan-cevallos", "/eventos/showbox-fight-night-5", "/noticias/cevallos-defiende-el-cinturon-ante-quinonez"]) {
    expect(xml).toContain(`<loc>${SITE}${path}</loc>`);
  }
  // Sembrados por global-setup: un boxeador en borrador y otro en la papelera.
  expect(xml).not.toContain("borrador-oculto");
  expect(xml).not.toContain("papelera-oculta");
  // Los datos de prueba del panel (carteleras armadas con boxeadores en borrador) tampoco.
  expect(xml).not.toContain("cartel-uno");
  expect(xml).not.toContain("/admin");
});

test("el panel no tiene sitemap", async ({ page }) => {
  const response = await page.goto(adminUrl("/sitemap.xml"));
  expect(response!.status()).toBe(404);
});

test("sin proveedor de analítica el sitio no carga ningún script de medición ni pone cookies", async ({ page, context }) => {
  for (const path of ["/", "/boxeadores", "/eventos/showbox-fight-night-5", "/noticias"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  await expect(page.locator('script[src*="umami"], script[src*="vercel"], script[src*="insights"], script[src*="analytics"]')).toHaveCount(0);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).toBe("");
});

test("el panel nunca lleva analítica", async ({ page }) => {
  await page.goto(adminUrl("/login"));
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  await expect(page.locator('script[src*="umami"], script[src*="vercel"], script[src*="insights"], script[src*="analytics"]')).toHaveCount(0);
});

test("un evento en borrador no se ve por su URL ni lleva datos estructurados; su vista previa va con noindex", async ({ page }) => {
  const card = await createE2eCard("Evento E2E SEO Borrador", { "Cartelera estelar": [["tres", "cuatro"]] }, { status: "draft" });

  await page.goto(`/eventos/${card.slug}`);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Evento E2E SEO Borrador/ })).toHaveCount(0);

  await page.goto(`/eventos/${card.slug}?preview=${createPreviewToken("event", card.eventId)}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(head.robots(page)).toHaveAttribute("content", /noindex/);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});
