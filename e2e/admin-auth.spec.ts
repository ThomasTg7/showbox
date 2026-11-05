import { expect, test } from "@playwright/test";
import { adminUrl, SEED_ADMIN_EMAIL, signInAsAdmin } from "./fixtures/admin";

const SECTIONS = [
  "Inicio",
  "Boxeadores",
  "Divisiones",
  "Eventos",
  "Noticias",
  "Rankings",
  "Patrocinadores",
  "Bandeja",
  "Configuración",
  "Usuarios",
  "Papelera",
  "Historial",
];

test("visitar el panel sin sesión termina en el login del subdominio", async ({ page }) => {
  await page.goto(adminUrl("/"));
  await expect(page).toHaveURL(adminUrl("/login"));
});

test("/admin en el sitio público lleva al subdominio del panel", async ({ page }) => {
  await page.goto("/admin/login?error=EMAIL_NOT_ALLOWED");
  await expect(page).toHaveURL(adminUrl("/login?error=EMAIL_NOT_ALLOWED"));
  await expect(page.getByText("Este correo no tiene acceso al panel.")).toBeVisible();
});

test("login del admin muestra Inicio, el sidebar completo, y dar acceso queda en el historial", async ({ page }) => {
  const newEmail = `nuevo-${Date.now()}@x.cl`;

  await signInAsAdmin(page);
  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

  const sections = page.locator('[data-slot="sidebar-content"] [data-slot="sidebar-menu-button"]');
  await expect(sections).toHaveCount(SECTIONS.length);
  for (const section of SECTIONS) {
    await expect(sections.filter({ hasText: section })).toHaveCount(1);
  }

  await page.getByRole("link", { name: "Usuarios" }).click();
  await expect(page).toHaveURL(adminUrl("/usuarios"));

  await page.getByLabel("Correo del nuevo administrador").fill(newEmail);
  await page.getByRole("button", { name: "Dar acceso" }).click();

  await expect(page.getByRole("cell", { name: newEmail })).toBeVisible();

  await page.getByRole("link", { name: "Historial" }).click();
  await expect(page).toHaveURL(adminUrl("/historial"));
  await expect(page.getByRole("cell", { name: new RegExp(newEmail) }).first()).toBeVisible();
});

test("la sesión del panel no viaja al sitio público", async ({ page, context }) => {
  await signInAsAdmin(page);
  const cookies = await context.cookies();
  expect(cookies.length).toBeGreaterThan(0);
  expect(cookies.every((cookie) => cookie.domain.startsWith("admin."))).toBe(true);
});

test("contraseña incorrecta muestra el error junto al campo", async ({ page }) => {
  await page.goto(adminUrl("/login"));
  await page.getByLabel("Correo").fill(SEED_ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill("no-es-la-clave");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
});

test("un rechazo de Google por lista blanca se explica en el login", async ({ page }) => {
  await page.goto(adminUrl("/login?error=EMAIL_NOT_ALLOWED"));

  await expect(page.getByText("Este correo no tiene acceso al panel.")).toBeVisible();
});

test("recuperar contraseña responde siempre con el mismo mensaje", async ({ page }) => {
  await page.goto(adminUrl("/login"));
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page).toHaveURL(adminUrl("/recuperar"));

  await page.getByLabel("Correo").fill("nadie@x.cl");
  await page.getByRole("button", { name: "Enviar enlace" }).click();

  await expect(page.getByRole("status")).toContainText("Si el correo tiene acceso al panel");
});

test("un enlace de contraseña inválido ofrece pedir otro", async ({ page }) => {
  await page.goto(adminUrl("/restablecer?error=INVALID_TOKEN"));

  await expect(page.getByText("El enlace no es válido o ya venció. Pide uno nuevo.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir un enlace nuevo" })).toBeVisible();
});

test("cerrar sesión vuelve al login y protege el panel", async ({ page }) => {
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(adminUrl("/login"));

  await page.goto(adminUrl("/usuarios"));
  await expect(page).toHaveURL(adminUrl("/login"));
});

test("si la sesión vence y se usa una acción del panel, termina en el login (no en una página del sitio)", async ({ page, context }) => {
  await signInAsAdmin(page);
  await page.goto(adminUrl("/usuarios"));
  await context.clearCookies();

  await page.getByLabel("Correo del nuevo administrador").fill(`vencida-${Date.now()}@x.cl`);
  await page.getByRole("button", { name: "Dar acceso" }).click();

  await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  await expect(page).toHaveURL(/^http:\/\/admin\.localhost:\d+\/(admin\/)?login$/);
});
