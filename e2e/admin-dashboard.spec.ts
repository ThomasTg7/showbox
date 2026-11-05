import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(adminUrl("/"));
  await expect(page.getByRole("heading", { name: "Inicio", level: 1 })).toBeVisible();
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("el inicio muestra el próximo evento y «Abrir noche de pelea» lleva a la consola de esa noche", async ({ page }) => {
  const card = page.locator('[data-slot="next-event"]');
  await expect(card.getByRole("heading", { name: "ShowBox Fight Night 5" })).toBeVisible();
  await expect(card.getByRole("timer", { name: "Cuenta regresiva" })).toBeVisible();
  await expect(card).toContainText(/\d+ peleas?/);

  const open = card.getByRole("link", { name: "Abrir noche de pelea" });
  const href = await open.getAttribute("href");
  expect(href).toMatch(/^\/eventos\/[0-9a-f-]{36}\/en-vivo$/);

  await open.click();
  await expect(page).toHaveURL(adminUrl(href as `/${string}`));
});

test("los accesos rápidos llevan a crear un boxeador, un evento y una noticia", async ({ page }) => {
  const quick = page.getByRole("navigation", { name: "Accesos rápidos" });
  await expect(quick.getByRole("link", { name: "Boxeador" })).toHaveAttribute("href", "/boxeadores/nuevo");
  await expect(quick.getByRole("link", { name: "Evento" })).toHaveAttribute("href", "/eventos/nuevo");
  await expect(quick.getByRole("link", { name: "Noticia" })).toHaveAttribute("href", "/noticias/nueva");

  await quick.getByRole("link", { name: "Noticia" }).click();
  await expect(page).toHaveURL(adminUrl("/noticias/nueva"));
});

test("muestra la bandeja, los borradores y los programados con un vacío claro", async ({ page }) => {
  await expect(page.locator('[data-slot="inbox-card"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Borradores", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Programados", level: 2 })).toBeVisible();
  // Los boxeadores en borrador del seed (los de las pruebas de cartelera) aparecen con su tipo y llevan a su edición.
  const firstDraft = page.getByRole("region", { name: "Borradores" }).getByRole("link").first();
  await expect(firstDraft).toContainText(/Boxeador|Evento|Noticia/);
  await expect(firstDraft).toHaveAttribute("href", /^\/(boxeadores|eventos|noticias)\/[0-9a-f-]{36}$/);
});

test.describe("en celular", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("el inicio se usa sin scroll horizontal y con botones táctiles de 44 px", async ({ page }) => {
    await expectNoHorizontalScroll(page);
    const open = page.getByRole("link", { name: "Abrir noche de pelea" });
    expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    for (const name of ["Boxeador", "Evento", "Noticia"]) {
      expect((await page.getByRole("navigation", { name: "Accesos rápidos" }).getByRole("link", { name }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
