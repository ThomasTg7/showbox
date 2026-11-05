import { expect, test, type Page } from "@playwright/test";
import { ACCOUNT_ADMIN_EMAIL, ACCOUNT_ADMIN_PASSWORD, adminUrl, signInAsAdmin } from "./fixtures/admin";

const NEW_PASSWORD = "NuevaCuenta456!";

async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

test("«Mi cuenta» cambia el nombre y la contraseña, con los errores junto a cada campo", async ({ page }) => {
  await signInAsAdmin(page, ACCOUNT_ADMIN_EMAIL, ACCOUNT_ADMIN_PASSWORD);
  await page.getByRole("link", { name: "Mi cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mi cuenta", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Correo")).toHaveValue(ACCOUNT_ADMIN_EMAIL);

  await page.getByLabel("Nombre").fill("Cuenta de Prueba");
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByText("Nombre guardado")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nombre")).toHaveValue("Cuenta de Prueba");

  // Contraseña actual equivocada y confirmación distinta: el mensaje va junto a su campo.
  await page.getByLabel("Contraseña actual").fill("equivocada");
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Repite la contraseña nueva").fill("otra-cosa-123");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible();

  await page.getByLabel("Contraseña actual").fill("equivocada");
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Repite la contraseña nueva").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("La contraseña actual no es correcta")).toBeVisible();

  await page.getByLabel("Contraseña actual").fill(ACCOUNT_ADMIN_PASSWORD);
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Repite la contraseña nueva").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText(/Contraseña guardada/)).toBeVisible();

  // Esta sesión sigue abierta, y la contraseña nueva sirve para entrar.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mi cuenta", level: 1 })).toBeVisible();
  await page.context().clearCookies();
  await signInAsAdmin(page, ACCOUNT_ADMIN_EMAIL, NEW_PASSWORD);
});

test.describe("en celular", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("«Mi cuenta» se usa sin scroll horizontal", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(adminUrl("/cuenta"));
    await expect(page.getByRole("heading", { name: "Mi cuenta", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cambiar contraseña" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
