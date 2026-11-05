import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("/entradas lista ShowBox Fight Night 5 con sus tres tramos, precios en pesos y la ticketera", async ({ page }) => {
  await page.goto("/entradas");
  await expect(page.getByRole("heading", { name: "Entradas", level: 1 })).toBeVisible();

  const section = page.locator('[data-event="showbox-fight-night-5"]');
  await expect(section.getByRole("heading", { name: "ShowBox Fight Night 5", level: 2 })).toBeVisible();
  await expect(section.locator("[data-tier]")).toHaveCount(3);
  await expect(section.locator('[data-tier="General"]')).toContainText("$15.000");
  await expect(section.locator('[data-tier="Preferencial"]')).toContainText("$25.000");
  await expect(section.locator('[data-tier="Ringside"]')).toContainText("$45.000");
  await expect(section.getByText("AGOTADO")).toHaveCount(0);

  // «Ir a la ticketera» abre la ticketera en otra pestaña, sin darle acceso a esta.
  const ticketOffice = section.getByRole("link", { name: /Ir a la ticketera/ });
  await expect(ticketOffice).toHaveAttribute("href", /example\.com\/entradas\/showbox-fight-night-5/);
  await expect(ticketOffice).toHaveAttribute("target", "_blank");
  await expect(ticketOffice).toHaveAttribute("rel", /noopener/);
  await expect(section.locator('[data-slot="ticket-points"]')).toContainText("Boletería del recinto");
  await expect(section.getByRole("link", { name: "Ver el evento" })).toHaveAttribute("href", "/eventos/showbox-fight-night-5");
});

test("un tramo agotado muestra AGOTADO y no tiene enlace; los demás llevan a la ticketera", async ({ page }) => {
  // El evento lo crea `e2e/global-setup.ts` (la lista de próximos está en caché y no se entera de lo que se escribe directo en la base).
  await page.goto("/entradas");
  const section = page.locator('[data-event="evento-e2e-entradas-agotadas"]');
  await expect(section).toBeVisible();

  const soldOut = section.locator('[data-tier="VIP"]');
  await expect(soldOut).toContainText("AGOTADO");
  await expect(soldOut).toHaveAttribute("data-sold-out", "true");
  await expect(soldOut.getByRole("link")).toHaveCount(0);

  const onSale = section.locator('[data-tier="General"]');
  await expect(onSale).toContainText("$12.000");
  await expect(onSale.getByRole("link")).toHaveAttribute("href", "https://tickets.example.cl/agotadas");
});

test("un evento en borrador no aparece en /entradas", async ({ page }) => {
  // Los dos eventos los crea `e2e/global-setup.ts`: el publicado demuestra que la lista ya incluye lo creado allí.
  await page.goto("/entradas");
  await expect(page.locator('[data-event="evento-e2e-entradas-agotadas"]')).toBeVisible();
  await expect(page.locator('[data-event="evento-e2e-borrador-listados"]')).toHaveCount(0);
});

for (const width of [320, 375, 768, 1440]) {
  test(`/entradas no tiene scroll horizontal a ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/entradas");
    await expect(page.getByRole("heading", { name: "Entradas", level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
