import { expect, type Page } from "@playwright/test";

// Admin creado por e2e/global-setup.ts en la BD de e2e (se vacía en cada corrida).
export const SEED_ADMIN_EMAIL = "seed-admin@openfightlatam.cl";
export const SEED_ADMIN_PASSWORD = "SeedPassword123!";
// Otro admin solo para `admin-account.spec.ts`: cambia su contraseña, y el de arriba lo usan todos los demás specs.
export const ACCOUNT_ADMIN_EMAIL = "cuenta-admin@openfightlatam.cl";
export const ACCOUNT_ADMIN_PASSWORD = "CuentaPassword123!";

/** El panel vive en su subdominio (playwright.config.ts fija ADMIN_URL): `adminUrl("/boxeadores")`. */
export function adminUrl(path: `/${string}`): string {
  return `${process.env.ADMIN_URL}${path}`;
}

export async function signInAsAdmin(page: Page, email = SEED_ADMIN_EMAIL, password = SEED_ADMIN_PASSWORD): Promise<void> {
  await page.goto(adminUrl("/login"));
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(adminUrl("/"));
}
