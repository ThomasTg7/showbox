import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(adminUrl("/divisiones"));
  await expect(page.getByRole("heading", { name: "Divisiones", level: 1 })).toBeVisible();
});

test("lista las 12 divisiones sin scroll horizontal en móvil y PC", async ({ page }) => {
  await expect(page.getByRole("button", { name: /^Arrastrar .* para reordenar$/ })).toHaveCount(12);
  await expect(page.getByText("Hasta 70.3 kg / 155 lb · 5 puestos en el ranking")).toBeVisible();
  for (const size of [{ width: 375, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await expectNoHorizontalScroll(page);
  }
});

test("crea, edita y desactiva una división", async ({ page }) => {
  await page.getByRole("button", { name: "Nueva división" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre").fill("Peso Máximo");
  await dialog.getByLabel("Límite de peso (kg)").fill("0");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog.getByText("El límite de peso debe ser mayor que 0")).toBeVisible();

  await dialog.getByLabel("Límite de peso (kg)").fill("135.5");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Hasta 135.5 kg / 299 lb · 5 puestos en el ranking")).toBeVisible();

  const row = page.getByRole("listitem").filter({ hasText: "Peso Máximo" });
  await row.getByRole("button", { name: "Editar" }).click();
  await dialog.getByLabel("Puestos en el ranking").fill("8");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByText(/8 puestos en el ranking/)).toBeVisible();

  await row.getByRole("switch").click();
  // El cambio se ve al instante; se espera el aviso de guardado antes de recargar.
  await expect(page.getByText("División desactivada")).toBeVisible();
  await expect(row.getByText("Inactiva")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Peso Máximo" }).getByText("Inactiva")).toBeVisible();
});

test("cambia el orden con los botones subir y bajar", async ({ page }) => {
  const males = page.locator("section").filter({ has: page.getByRole("heading", { name: "Masculinas" }) });
  await expect(males.getByRole("listitem").first()).toContainText("Mosca");
  await males.getByRole("button", { name: "Bajar Mosca" }).click();
  await expect(page.getByText("Orden guardado")).toBeVisible();
  await expect(males.getByRole("listitem").first()).toContainText("Gallo");
  await page.reload();
  await expect(males.getByRole("listitem").first()).toContainText("Gallo");
});
