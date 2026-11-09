import { expect, test, type Page } from "@playwright/test";

// Las pruebas de la home dependen del seed (ShowBox Fight Night 5: Cevallos vs Quiñónez, sus noticias, rankings y patrocinadores) y no lo modifican.

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("home con movimiento", () => {
  test("la rueda recorre toda la home después de navegar desde una página más corta", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/eventos");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await page.getByRole("link", { name: "ShowBox Promotions inicio" }).click();
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    const end = await page.locator("#boxeadores").evaluate((section) => {
      const spacer = section.parentElement!;
      return spacer.getBoundingClientRect().bottom + scrollY;
    });
    await page.mouse.move(700, 600);
    for (let index = 0; index < 14; index++) {
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(250);
    }
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(end);
    await page.mouse.wheel(0, -1000);
    const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(bottom - 500);
  });

  test("muestra la portada con el careo, la cuenta regresiva y las entradas", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('[data-slot="hero-red"]')).toHaveText("Cevallos");
    await expect(page.locator('[data-slot="hero-blue"]')).toHaveText("Quiñónez");
    // El reloj aparece al hidratar; la fecha escrita ya está en el HTML.
    await expect(page.getByRole("timer", { name: "Cuenta regresiva" })).toContainText(/\d\d/);
    await expect(page.getByRole("link", { name: /Comprar entradas/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver cartelera/ })).toBeVisible();
  });

  test("tiene todas las secciones de la maqueta con sus textos", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#cartelera").getByRole("heading", { name: /Cartelera\s+ShowBox Fight Night 5/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Noticias", level: 2, exact: true })).toBeVisible();
    const topNews = page.getByRole("complementary").filter({ has: page.getByRole("heading", { name: "Top Noticias" }) });
    await expect(topNews).toBeVisible();
    await expect(topNews.getByRole("listitem")).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "No te lo pierdas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boxeadores", level: 2 })).toBeVisible();
    await expect(page.getByRole("region", { name: "ShowBox Promotions en cifras" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rankings", level: 2 })).toBeVisible();
    await expect(page.locator("#entradas").getByRole("heading", { name: /Vive la\s+velada/, level: 2 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Patrocinadores", exact: true })).toBeVisible();
    await expect(page.getByText("Patrocinadores oficiales")).toBeVisible();
  });

  test("los destacados salen del ranking: el campeón y los primeros de cada división, con su etiqueta", async ({ page }) => {
    await page.goto("/");

    const fighters = page.locator("#boxeadores");
    const cevallos = fighters.locator("article", { hasText: "Bryan Cevallos" });
    await expect(cevallos).toContainText("Campeón");
    await expect(fighters.locator("article", { hasText: "Jordan Quiñónez" })).toContainText("#1");
    await expect(fighters.getByRole("link", { name: /Todo el plantel/ })).toHaveAttribute("href", "/boxeadores");
  });

  test("las cifras salen de los eventos finalizados", async ({ page }) => {
    await page.goto("/");

    const stats = page.getByRole("region", { name: "ShowBox Promotions en cifras" });
    for (const label of ["Eventos", "Peleas", "Rounds disputados", "KO / TKO"]) {
      await expect(stats.getByText(label, { exact: true })).toBeVisible();
    }
    await expect.poll(async () => Number(await stats.locator("dd").first().textContent())).toBeGreaterThan(0);
  });

  test("los rankings se alternan entre Pro y Amateur sin pedir nada al servidor", async ({ page }) => {
    await page.goto("/");

    const rankings = page.locator("#rankings");
    await expect(rankings.getByRole("tab", { name: "Pro" })).toHaveAttribute("aria-selected", "true");
    await expect(rankings.locator('[data-level="pro"]')).toBeVisible();
    await expect(rankings.locator('[data-level="amateur"]')).toBeHidden();
    await expect(rankings.getByRole("article").first()).toContainText("P4P");

    // Datos al servidor: las imágenes que cargan al hacer scroll no cuentan.
    const requests: string[] = [];
    page.on("request", (request) => {
      if (["document", "fetch", "xhr"].includes(request.resourceType())) requests.push(request.url());
    });
    // Un clic antes de hidratar no hace nada: se reintenta hasta que la página responde.
    await expect(async () => {
      await rankings.getByRole("tab", { name: "Amateur" }).click();
      await expect(rankings.locator('[data-level="amateur"]')).toBeVisible({ timeout: 1000 });
    }).toPass();

    await expect(rankings.locator('[data-level="pro"]')).toBeHidden();
    expect(requests).toEqual([]);
    await expect(rankings.getByRole("link", { name: /Ver todos los rankings/ })).toHaveAttribute("href", "/rankings?nivel=amateur");
  });

  test("«No te lo pierdas» se recorre con las flechas", async ({ page }) => {
    await page.goto("/");

    const rail = page.locator("#no-te-lo-pierdas");
    await expect(rail.getByRole("list", { name: "Videos y galerías" }).getByRole("listitem").first()).toBeVisible();
    await expect(rail.getByRole("button", { name: "Siguiente" })).toBeVisible();
    await expect(rail.getByRole("button", { name: "Anterior" })).toBeVisible();
  });

  test("la entrada de cada bloque aparece al llegar a él, y la presentación solo se ve en la primera visita", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-slot="intro-loader"]')).toBeVisible();
    await expect(page.locator('[data-slot="intro-loader"]')).toHaveCount(0);

    const stats = page.getByRole("region", { name: "ShowBox Promotions en cifras" }).locator("dl");
    await expect(stats).toHaveCSS("opacity", "0");
    await stats.scrollIntoViewIfNeeded();
    await expect(stats).toHaveCSS("opacity", "1");

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('[data-slot="intro-loader"]')).toHaveCount(0);
  });

  test("en pantalla ancha la sección de boxeadores se fija y avanza en horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.locator("#boxeadores").scrollIntoViewIfNeeded();
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    const section = page.locator("#boxeadores");
    const range = await section.evaluate((element) => {
      const spacer = element.parentElement!;
      const viewport = element.querySelector('[role="group"]')!;
      const track = element.querySelector("ul")!;
      return { start: spacer.getBoundingClientRect().top + scrollY, distance: track.scrollWidth - viewport.clientWidth };
    });
    expect(range.distance).toBeGreaterThan(0);
    for (const fraction of [0.15, 0.5, 0.85, 0.3]) {
      await page.evaluate((y) => window.scrollTo(0, y), range.start + range.distance * fraction);
      // A pin-spacer alone is insufficient: a transformed ancestor can move the fixed section offscreen.
      await expect.poll(async () => Math.abs((await section.boundingBox())!.y)).toBeLessThan(2);
      await expect.poll(() => section.locator("ul").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41)).toBeLessThan(-20);
      expect(await section.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(innerWidth / 2, Math.min(innerHeight - 40, rect.height / 2)));
      })).toBe(true);
    }
    await page.evaluate((y) => window.scrollTo(0, y), range.start + range.distance + 200);
    await expect.poll(async () => (await section.boundingBox())!.y).toBeLessThan(-100);
  });

  test("en pantalla angosta es un carrusel con imán, sin fijar nada", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto("/");

    await page.locator("#boxeadores").scrollIntoViewIfNeeded();
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    const carousel = page.locator("#boxeadores").getByRole("group", { name: "Boxeadores destacados" });
    expect(await carousel.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  });
});

test.describe("home con «reducir movimiento»", () => {
  test.use({ reducedMotion: "reduce" });

  test("todo el contenido se ve sin esperar ninguna animación", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('[data-slot="intro-loader"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="hero-red"]')).toHaveText("Cevallos");
    // Ningún bloque queda escondido esperando su entrada.
    const hidden = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter((element) => element.style.opacity === "0").length);
    expect(hidden).toBe(0);
    for (const heading of ["Noticias", "No te lo pierdas", "Boxeadores", "Rankings"]) {
      await expect(page.getByRole("heading", { name: heading, level: 2, exact: true })).toBeVisible();
    }
    await expect(page.locator("#entradas").getByRole("heading", { name: /Vive la\s+velada/, level: 2 })).toBeVisible();
    // Las cifras traen su valor final desde el HTML.
    const stats = page.getByRole("region", { name: "ShowBox Promotions en cifras" });
    await expect.poll(async () => Number(await stats.locator("dd").first().textContent())).toBeGreaterThan(0);
    // Sin fijar ni mover nada: el carrusel de boxeadores y la cinta de patrocinadores quedan quietos.
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(page.locator('[data-slot="marquee"] > div')).toHaveCSS("animation-name", "none");
  });
});

for (const width of [320, 375, 768, 1440]) {
  test(`la home no tiene scroll horizontal a ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
    // También abajo, con todo revelado y la sección de boxeadores en su estado final.
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expectNoHorizontalScroll(page);
  });
}
