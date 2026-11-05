import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

const card = (page: Page, name: string) => page.getByRole("heading", { name, level: 2 });

test("filtrar por división muestra solo a los boxeadores de esa división", async ({ page }) => {
  await page.goto("/boxeadores?division=peso-superligero");
  await expect(page.getByRole("heading", { name: "Boxeadores", level: 1 })).toBeVisible();
  await expect(card(page, "Bryan Cevallos")).toBeVisible();
  await expect(card(page, "Jordan Quiñónez")).toBeVisible();
  await expect(card(page, "Mishel Caicedo")).toHaveCount(0);
  await expect(card(page, "Luis Mina")).toHaveCount(0);
});

test("buscar por apodo, sin tildes ni mayúsculas, desde el buscador", async ({ page }) => {
  await page.goto("/boxeadores");
  await page.getByRole("searchbox", { name: "Buscar" }).fill("LEONA");
  await expect(page).toHaveURL(/q=LEONA/);
  await expect(card(page, "Mishel Caicedo")).toBeVisible();
  await expect(card(page, "Bryan Cevallos")).toHaveCount(0);

  await page.goto("/boxeadores?q=cevallos");
  await expect(card(page, "Bryan Cevallos")).toBeVisible();
});

test("por defecto solo se ven los activos; los retirados se piden con el filtro de estado", async ({ page }) => {
  await page.goto("/boxeadores");
  await expect(card(page, "Bryan Cevallos")).toBeVisible();
  await expect(card(page, "Patricio Ortiz")).toHaveCount(0);
  await page.goto("/boxeadores?estado=retired");
  await expect(card(page, "Patricio Ortiz")).toBeVisible();
  await expect(card(page, "Bryan Cevallos")).toHaveCount(0);
});

test("un boxeador sin foto muestra la silueta de la marca", async ({ page }) => {
  await page.goto("/boxeadores?q=camila");
  const cardArticle = page.getByRole("article").filter({ has: card(page, "Mishel Caicedo") });
  await expect(cardArticle.locator('[data-slot="fighter-silhouette"]')).toBeVisible();
  await expect(cardArticle.locator("img")).toHaveCount(0);
});

test("la tarjeta muestra nombre, apodo, país, división y récord", async ({ page }) => {
  await page.goto("/boxeadores?q=toro");
  const cardArticle = page.getByRole("article").filter({ has: card(page, "Bryan Cevallos") });
  await expect(cardArticle.getByText("“El Martillo”")).toBeVisible();
  await expect(cardArticle.getByRole("img", { name: "Chile" })).toBeVisible();
  await expect(cardArticle.getByText("Peso Ligero · 70.3 kg / 155 lb")).toBeVisible();
  await expect(cardArticle.locator('[data-count="12"]')).toHaveText("12");
  await expect(cardArticle.getByRole("link", { name: "Bryan Cevallos" })).toHaveAttribute("href", "/boxeadores/bryan-cevallos");
});

test("con «reducir movimiento» los récords se ven de inmediato", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/boxeadores?q=toro");
  await expect(page.locator('[data-count="12"]')).toHaveText("12");
  await context.close();
});

test("sin resultados muestra un mensaje y la salida para ver a todos", async ({ page }) => {
  await page.goto("/boxeadores?q=zzzzzz");
  await expect(page.getByText("Sin resultados")).toBeVisible();
  await page.getByRole("link", { name: "Ver todos los boxeadores" }).click();
  await expect(card(page, "Bryan Cevallos")).toBeVisible();
  // Los filtros vuelven a coincidir con la URL (no queda la búsqueda anterior escrita).
  await expect(page.getByRole("searchbox", { name: "Buscar" })).toHaveValue("");
});

for (const width of [320, 375, 768, 1440]) {
  test(`sin scroll horizontal a ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/boxeadores");
    await expect(card(page, "Bryan Cevallos")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
