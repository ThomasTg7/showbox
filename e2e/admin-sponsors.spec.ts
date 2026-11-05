import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="300" fill="#933"/></svg>';

// Cada prueba recorre varias páginas que `next dev` compila al visitarlas por primera vez.
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(adminUrl("/patrocinadores"));
  await expect(page.getByRole("heading", { name: "Patrocinadores", level: 1 })).toBeVisible();
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Abre «Nuevo patrocinador», sube el logo SVG y deja el diálogo listo para completar el resto. */
async function openNewSponsor(page: Page, name: string) {
  await page.getByRole("button", { name: "Nuevo patrocinador" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo patrocinador" });
  await dialog.getByLabel("Nombre").fill(name);
  await dialog.locator('input[type="file"]').setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from(SVG) });
  await expect(dialog.locator('input[name="logoMediaId"]')).toHaveValue(/^[0-9a-f-]{36}$/);
  return dialog;
}

async function save(page: Page, message: string) {
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText(message)).toBeVisible();
}

test("un patrocinador principal sale en el footer, deja de verse al vencer y sale con la papelera", async ({ page }) => {
  const dialog = await openNewSponsor(page, "E2E Titán Principal");
  await dialog.getByLabel("Nivel").selectOption("principal");
  await save(page, "Patrocinador creado");

  const row = page.locator('[data-sponsor="E2E Titán Principal"]');
  await expect(row).toContainText("Visible");
  await expect(row).toContainText("Todos los eventos");
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("img", { name: "E2E Titán Principal" })).toBeVisible();

  // Con la vigencia vencida desaparece del sitio, pero se queda en el panel como «Vencido».
  await page.goto(adminUrl("/patrocinadores"));
  await row.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("dialog").getByLabel("Visible hasta").fill("2020-01-01");
  await save(page, "Cambios guardados");
  await expect(row).toContainText("Vencido");
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("img", { name: "E2E Titán Principal" })).toHaveCount(0);

  await page.goto(adminUrl("/patrocinadores"));
  await row.getByRole("button", { name: "Enviar E2E Titán Principal a la papelera" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar a la papelera" }).click();
  await expect(page.getByText("Patrocinador enviado a la papelera")).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.goto(adminUrl("/papelera"));
  await expect(page.getByText("E2E Titán Principal").first()).toBeVisible();
});

test("el orden de un nivel se cambia con los botones y se conserva al recargar", async ({ page }) => {
  for (const name of ["E2E Orden A", "E2E Orden B"]) {
    const dialog = await openNewSponsor(page, name);
    await dialog.getByLabel("Nivel").selectOption("colaborador");
    await save(page, "Patrocinador creado");
    await expect(page.locator(`[data-sponsor="${name}"]`)).toBeVisible();
  }
  const order = () => page.locator('[data-sponsor^="E2E Orden"]').evaluateAll((rows) => rows.map((row) => row.getAttribute("data-sponsor")));
  expect(await order()).toEqual(["E2E Orden A", "E2E Orden B"]);

  await page.getByRole("button", { name: "Subir E2E Orden B" }).click();
  await expect(page.getByText("Orden guardado")).toBeVisible();
  await page.reload();
  await expect.poll(order).toEqual(["E2E Orden B", "E2E Orden A"]);

  for (const name of ["E2E Orden A", "E2E Orden B"]) {
    await page.getByRole("button", { name: `Enviar ${name} a la papelera` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Enviar a la papelera" }).click();
    await expect(page.locator(`[data-sponsor="${name}"]`)).toHaveCount(0);
  }
});

test("un patrocinador de un evento solo sale en la página de ese evento", async ({ page }) => {
  const dialog = await openNewSponsor(page, "E2E Solo Evento");
  await dialog.getByLabel("Nivel").selectOption("principal");
  await dialog.getByRole("switch", { name: "Todos los eventos" }).click();
  await dialog.getByLabel("Buscar eventos del patrocinador").fill("ShowBox Fight Night 5");
  await dialog.getByRole("button", { name: /ShowBox Fight Night 5/ }).click();
  await save(page, "Patrocinador creado");
  await expect(page.locator('[data-sponsor="E2E Solo Evento"]')).toContainText("ShowBox Fight Night 5");

  await page.goto("/eventos/showbox-fight-night-5");
  const eventSponsors = page.locator('[data-slot="event-sponsors"]');
  await expect(eventSponsors.getByRole("img", { name: "E2E Solo Evento" })).toBeVisible();
  // Los patrocinadores de todos los eventos también salen en la página del evento.
  await expect(eventSponsors.getByRole("img", { name: "IronGym" })).toBeVisible();
  // Ni la home ni el footer lo muestran.
  await page.goto("/");
  await expect(page.getByRole("img", { name: "E2E Solo Evento" })).toHaveCount(0);

  await page.goto(adminUrl("/patrocinadores"));
  await page.getByRole("button", { name: "Enviar E2E Solo Evento a la papelera" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar a la papelera" }).click();
  await expect(page.locator('[data-sponsor="E2E Solo Evento"]')).toHaveCount(0);
});

test("el formulario avisa junto a cada campo lo que falta", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo patrocinador" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo patrocinador" });
  await dialog.getByLabel("Visible desde").fill("2026-12-01");
  await dialog.getByLabel("Visible hasta").fill("2026-11-01");
  await dialog.getByRole("switch", { name: "Todos los eventos" }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  await expect(dialog.getByText("El nombre es obligatorio")).toBeVisible();
  await expect(dialog.getByText("Sube el logo del patrocinador")).toBeVisible();
  await expect(dialog.getByText("El término no puede ser antes del inicio")).toBeVisible();
  await expect(dialog.getByText("Elige al menos un evento o marca «Todos los eventos»")).toBeVisible();
});

test.describe("en celular", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("la lista y el formulario se usan sin scroll horizontal", async ({ page }) => {
    await expect(page.locator('[data-sponsor="IronGym"]')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: "Nuevo patrocinador" }).click();
    await expect(page.getByRole("dialog", { name: "Nuevo patrocinador" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
