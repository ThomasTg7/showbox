import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

const BODY_PHOTO = path.join(__dirname, "fixtures", "fighter-body.png");

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

test("el listado muestra los boxeadores sin scroll horizontal en móvil y PC", async ({ page }) => {
  await page.goto(adminUrl("/boxeadores"));
  await expect(page.getByRole("heading", { name: "Boxeadores", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar Bryan Cevallos" }).first()).toBeVisible();
  for (const size of [{ width: 375, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await expectNoHorizontalScroll(page);
  }
});

test("crear a Tomás Vera con foto, publicarlo, enviarlo a la papelera y restaurarlo", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(adminUrl("/boxeadores/nuevo"));

  // Sin nombre: el error aparece junto al campo, en la pestaña correspondiente.
  await page.getByRole("button", { name: "Crear boxeador" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "El nombre es obligatorio" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Selecciona una división" })).toBeVisible();

  await page.getByLabel("Nombre", { exact: true }).fill("Tomás");
  await page.getByLabel("Apellido").fill("Vera");
  await page.getByLabel("Apodo").fill("El Tanque");
  await page.getByLabel("División").selectOption({ label: "Ligero · hasta 70.3 kg" });

  await page.getByRole("tab", { name: "Fotos" }).click();
  await page.locator('input[type="file"]').first().setInputFiles(BODY_PHOTO);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Texto alternativo").fill("Tomás Vera de frente");
  await dialog.getByRole("button", { name: "Guardar imagen" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("img", { name: "Tomás Vera de frente" })).toBeVisible();

  await page.getByRole("tab", { name: "Publicación" }).click();
  await page.getByRole("radio", { name: "Programar" }).check();
  await expect(page.getByText("Elige fecha y hora")).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear boxeador" })).toBeDisabled();
  await page.getByRole("radio", { name: "Publicado" }).check();
  await expect(page.getByRole("button", { name: "Crear boxeador" })).toBeEnabled();

  await page.getByRole("button", { name: "Crear boxeador" }).click();
  await expect(page).toHaveURL(/^http:\/\/admin\.localhost:\d+\/boxeadores\/[0-9a-f-]+\?creado=1$/);
  await expect(page.getByRole("heading", { name: "Tomás Vera", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Enlace de la ficha")).toHaveValue("tomas-vera");

  // Publicado: el listado público lo muestra, con su foto.
  await page.goto("/boxeadores?q=vera");
  await expect(page.getByRole("heading", { name: "Tomás Vera", level: 2 })).toBeVisible();
  await expect(page.getByRole("img", { name: "Tomás Vera de frente" })).toBeVisible();

  await page.goto(adminUrl("/boxeadores?q=vera"));
  const row = page.getByRole("row").filter({ hasText: "Tomás Vera" });
  await expect(row.getByText("Publicado")).toBeVisible();
  await row.getByRole("button", { name: "Enviar a la papelera a Tomás Vera" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar a la papelera" }).click();
  await expect(page.getByText("Ningún boxeador coincide con esos filtros")).toBeVisible();

  // En la papelera: ya no aparece en el sitio (la caché se invalida al enviarlo).
  await page.goto("/boxeadores?q=vera");
  await expect(page.getByText("Sin resultados")).toBeVisible();

  await page.goto(adminUrl("/papelera"));
  await page.getByRole("listitem").or(page.getByRole("row")).filter({ hasText: "Tomás Vera" }).getByRole("button", { name: "Restaurar" }).click();
  // Sin esperar el aviso, `goto` cancelaba la acción en curso cuando la máquina iba cargada.
  await expect(page.getByText("Restauraste boxeador «Tomás Vera»")).toBeVisible();
  await page.goto(adminUrl("/boxeadores?q=vera"));
  await expect(page.getByRole("row").filter({ hasText: "Tomás Vera" })).toBeVisible();
  await page.goto("/boxeadores?q=vera");
  await expect(page.getByRole("heading", { name: "Tomás Vera", level: 2 })).toBeVisible();
});

test("editar un boxeador conserva lo escrito y el enlace al renombrarlo", async ({ page }) => {
  // Andrés Tapia no aparece en las pruebas del sitio público: renombrarlo no las afecta (corren en paralelo).
  await page.goto(adminUrl("/boxeadores?q=nunez"));
  await page.getByRole("link", { name: "Editar Andrés Tapia" }).first().click();
  await page.getByLabel("Nombre", { exact: true }).fill("Andrés Andrés");
  await page.getByRole("tab", { name: "Físico" }).click();
  await page.getByLabel("Gimnasio").fill("Andes Fight Club");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados")).toBeVisible();
  await expect(page.getByLabel("Gimnasio")).toHaveValue("Andes Fight Club");
  await page.getByRole("tab", { name: "Datos" }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Andrés Andrés");
  await expect(page.getByLabel("Enlace de la ficha")).toHaveValue("andres-tapia");
});

test("el formulario se usa en celular sin scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(adminUrl("/boxeadores/nuevo"));
  await expectNoHorizontalScroll(page);
  // Las pestañas ocupan dos filas en celular: la lista crece y no tapa el primer campo.
  const tabsBottom = await page.getByRole("tablist").evaluate((element) => element.getBoundingClientRect().bottom);
  const lastTabBottom = await page.getByRole("tab", { name: "Publicación" }).evaluate((element) => element.getBoundingClientRect().bottom);
  const firstFieldTop = await page.getByText("Nombre", { exact: true }).evaluate((element) => element.getBoundingClientRect().top);
  expect(tabsBottom).toBeGreaterThanOrEqual(lastTabBottom);
  expect(firstFieldTop).toBeGreaterThan(lastTabBottom);
  for (const tab of ["Físico", "Récord total", "Fotos", "Redes", "Publicación"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expectNoHorizontalScroll(page);
  }
  await expect(page.getByRole("button", { name: "Crear boxeador" })).toBeInViewport();
});

// El panel transmite la página por partes (loading.tsx): el código HTTP ya salió como 200, así que se mira el contenido.
test("un boxeador que no existe (o un id inválido) muestra «no encontrado» en español", async ({ page }) => {
  for (const id of ["no-es-un-id", "00000000-0000-4000-8000-000000000000"]) {
    await page.goto(adminUrl(`/boxeadores/${id}`));
    await expect(page.getByRole("heading", { name: "No encontramos lo que buscas" })).toBeVisible();
  }
});
