import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Crea un evento borrador con lo mínimo y devuelve su id (está en la URL de edición). */
async function createEvent(page: Page, name: string): Promise<string> {
  await page.goto(adminUrl("/eventos/nuevo"));
  await page.getByLabel("Nombre del evento").fill(name);
  await page.getByRole("tab", { name: "Horarios y lugar" }).click();
  await page.getByLabel("Fecha del evento").fill("2031-05-17");
  await page.getByLabel("Recinto").fill("Arena Santiago");
  await page.getByLabel("Ciudad").fill("Santiago");
  await page.getByLabel("Dirección").fill("Av. Ejemplo 1234");
  await page.getByRole("button", { name: "Crear evento" }).click();
  await expect(page).toHaveURL(/\/eventos\/[0-9a-f-]+\?creado=1$/);
  return page.url().match(/\/eventos\/([0-9a-f-]+)\?/)![1]!;
}

/** Espera a que termine la próxima server action de esta página (recargar antes la cancelaría a medias). */
function nextAction(page: Page) {
  return page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/cartelera"));
}

async function addSegment(page: Page, name: string) {
  await page.getByRole("button", { name: "Agregar bloque" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del bloque").fill(name);
  await dialog.getByRole("button", { name: "Guardar bloque" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("region", { name: `Bloque ${name}` })).toBeVisible();
}

async function addBout(page: Page, segmentName: string, red: string, blue: string) {
  await page.getByRole("region", { name: `Bloque ${segmentName}` }).getByRole("button", { name: "Agregar pelea" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox", { name: "Esquina roja" }).fill(red);
  await dialog.getByRole("button", { name: new RegExp(red) }).click();
  await dialog.getByRole("searchbox", { name: "Esquina azul" }).fill(blue);
  await dialog.getByRole("button", { name: new RegExp(blue) }).click();
  await dialog.locator("#bout-division").selectOption({ label: "Ligero · hasta 70.3 kg" });
  await dialog.getByRole("button", { name: "Agregar pelea" }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

test("el listado muestra los eventos y no desborda en móvil ni en PC", async ({ page }) => {
  await page.goto(adminUrl("/eventos"));
  await expect(page.getByRole("heading", { name: "Eventos", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar ShowBox Fight Night 5" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Cartelera de ShowBox Fight Night 5" }).first()).toBeVisible();
  for (const size of [{ width: 375, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await expectNoHorizontalScroll(page);
  }
});

test("crear un evento pide lo obligatorio junto a cada campo, guarda los tramos de entradas y lo publica", async ({ page }) => {
  await page.goto(adminUrl("/eventos/nuevo"));
  // Sin nombre: el error sale junto al campo y abre su pestaña.
  await page.getByRole("tab", { name: "Horarios y lugar" }).click();
  await page.getByLabel("Fecha del evento").fill("2031-06-21");
  await page.getByLabel("Recinto").fill("Arena Santiago");
  await page.getByLabel("Ciudad").fill("Santiago");
  await page.getByLabel("Dirección").fill("Av. Ejemplo 1234");
  await page.getByRole("button", { name: "Crear evento" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "El nombre es obligatorio" })).toBeVisible();

  // Con nombre pero sin ciudad: el error de la otra pestaña se muestra y la abre.
  await page.getByLabel("Nombre del evento").fill("Evento E2E Entradas");
  await page.getByRole("tab", { name: "Horarios y lugar" }).click();
  await page.getByLabel("Ciudad").fill("");
  await page.getByRole("button", { name: "Crear evento" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "La ciudad es obligatoria" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "El nombre es obligatorio" })).toHaveCount(0);
  await page.getByLabel("Ciudad").fill("Santiago");
  await page.getByLabel("Apertura de puertas (opcional)").fill("19:30");
  await page.getByLabel("Término estimado (opcional)").fill("00:30");

  await page.getByRole("tab", { name: "Entradas" }).click();
  await page.getByRole("button", { name: "Agregar tramo" }).click();
  await page.getByLabel("Nombre del tramo").fill("General");
  await page.getByLabel("Precio (USD)").fill("15.000");
  await page.getByRole("button", { name: "Agregar tramo" }).click();
  await page.getByLabel("Nombre del tramo").nth(1).fill("Ringside");
  await page.getByLabel("Precio (USD)").nth(1).fill("45000");
  // El punto de miles aparece mientras se escribe.
  await expect(page.getByLabel("Precio (USD)").nth(1)).toHaveValue("45.000");
  await page.getByRole("switch", { name: /Agotado: Ringside/ }).click();

  await page.getByRole("tab", { name: "Publicación" }).click();
  await page.getByRole("radio", { name: "Publicado" }).check();
  await page.getByRole("button", { name: "Crear evento" }).click();
  await expect(page).toHaveURL(/\/eventos\/[0-9a-f-]+\?creado=1$/);
  await expect(page.getByRole("heading", { name: "Evento E2E Entradas", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Enlace del evento")).toHaveValue("evento-e2e-entradas");

  // Lo guardado se vuelve a ver al editar: horarios y tramos.
  await page.getByRole("tab", { name: "Horarios y lugar" }).click();
  await expect(page.getByLabel("Apertura de puertas (opcional)")).toHaveValue("19:30");
  await expect(page.getByLabel("Término estimado (opcional)")).toHaveValue("00:30");
  await page.getByRole("tab", { name: "Entradas" }).click();
  await expect(page.getByLabel("Nombre del tramo")).toHaveCount(2);
  await expect(page.getByLabel("Precio (USD)").first()).toHaveValue("15.000");
  await expect(page.getByRole("switch", { name: /Agotado: Ringside/ })).toBeChecked();
});

test("armar la cartelera: bloque, dos peleas, reordenar arrastrando y con botones, y persiste al recargar", async ({ page }) => {
  test.setTimeout(120_000);
  const id = await createEvent(page, "Evento E2E Cartelera");
  await page.goto(adminUrl(`/eventos/${id}/cartelera`));
  await expect(page.getByText("La cartelera está vacía")).toBeVisible();

  await addSegment(page, "Estelar");
  await addBout(page, "Estelar", "Cartel Uno", "Cartel Dos");
  await addBout(page, "Estelar", "Cartel Tres", "Cartel Cuatro");
  const cards = page.getByTestId("bout-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText("Cartel Uno");

  // Un boxeador ya en la cartelera no se puede elegir de nuevo (el buscador lo marca).
  await page.getByRole("button", { name: "Agregar pelea" }).click();
  await page.getByRole("dialog").getByRole("searchbox", { name: "Esquina roja" }).fill("Cartel Uno");
  await expect(page.getByRole("dialog").getByRole("button", { name: /Cartel Uno.*Ya está en la cartelera/ })).toBeDisabled();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Arrastrar la segunda pelea sobre la primera.
  const handle = cards.nth(1).getByRole("button", { name: /Arrastrar la pelea/ });
  const target = await cards.first().boundingBox();
  const from = await handle.boundingBox();
  expect(target && from).toBeTruthy();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + from!.width / 2, from!.y - 20, { steps: 5 });
  // dnd-kit mide los destinos entre cuadros de animación: sin pausas, el soltado llega antes de saber qué hay debajo.
  await page.waitForTimeout(150);
  await page.mouse.move(target!.x + 40, target!.y + 10, { steps: 15 });
  await page.waitForTimeout(150);
  const dropped = nextAction(page);
  await page.mouse.up();
  await dropped;
  await expect(cards.first()).toContainText("Cartel Tres");
  await page.reload();
  await expect(cards.first()).toContainText("Cartel Tres");
  await expect(cards.nth(1)).toContainText("Cartel Uno");

  // Con botones (táctil y teclado): bajar la primera devuelve el orden original.
  const lowered = nextAction(page);
  await cards.first().getByRole("button", { name: /Bajar la pelea/ }).click();
  await lowered;
  await expect(cards.first()).toContainText("Cartel Uno");
  await page.reload();
  await expect(cards.first()).toContainText("Cartel Uno");

  // Mover a otro bloque desde el menú.
  await addSegment(page, "Preliminares");
  await cards.first().getByRole("button", { name: /Más acciones/ }).click();
  await page.getByRole("menuitem", { name: "Preliminares" }).click();
  await expect(page.getByRole("region", { name: "Bloque Preliminares" }).getByTestId("bout-card")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Bloque Estelar" }).getByTestId("bout-card")).toHaveCount(1);

  // Un bloque con peleas no se elimina; uno vacío sí.
  await expect(page.getByRole("button", { name: "Eliminar el bloque Preliminares" })).toBeDisabled();
});

test("registrar un resultado por RTD (R2 2:42), corregirlo y anularlo", async ({ page }) => {
  test.setTimeout(120_000);
  const id = await createEvent(page, "Evento E2E Resultado");
  await page.goto(adminUrl(`/eventos/${id}/cartelera`));
  await addSegment(page, "Estelar");
  await addBout(page, "Estelar", "Cartel Cinco", "Cartel Seis");

  await page.getByRole("button", { name: /Registrar el resultado de/ }).click();
  const dialog = page.getByRole("dialog");
  // Sin elegir nada: el error sale junto al campo y no se envía.
  await dialog.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: "Elige el resultado" })).toBeVisible();

  await dialog.getByLabel(/Gana Seis/).check();
  await dialog.getByLabel("Método").selectOption("ko_tko");
  await dialog.getByLabel("Tipo de KO/TKO").selectOption("rtd");
  await dialog.getByLabel("Round", { exact: true }).selectOption("2");
  await dialog.getByLabel("Tiempo (m:ss)").fill("4:00");
  await dialog.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: "El tiempo no puede superar 3:00" }).first()).toBeVisible();
  await dialog.getByLabel("Tiempo (m:ss)").fill("2:42");
  await dialog.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Seis vence a Cinco · RTD (retiro en la esquina) · R2 2:42")).toBeVisible();

  // Con resultado la pelea no se edita: primero hay que corregir o borrar el resultado.
  await expect(page.getByRole("button", { name: /Editar la pelea/ })).toBeDisabled();

  // Corregir: pasa a ganar el rojo por decisión.
  await page.getByRole("button", { name: /Corregir el resultado de/ }).click();
  await dialog.getByLabel(/Gana Cinco/).check();
  await dialog.getByLabel("Método").selectOption("decision");
  await dialog.getByLabel("Tipo de decisión").selectOption("unanimous");
  await dialog.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Cinco vence a Seis · Decisión unánime")).toBeVisible();

  // Anular: queda «sin resultado» por anulación.
  await page.getByRole("button", { name: /Corregir el resultado de/ }).click();
  await dialog.getByRole("button", { name: "Anular resultado" }).click();
  await dialog.getByLabel(/Por qué se anula/).fill("Dopaje del ganador");
  await dialog.getByRole("button", { name: "Confirmar anulación" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Cinco vs Seis · Sin resultado (resultado anulado)")).toBeVisible();
});

test("duplicar un evento crea un borrador con la cartelera vacía y enviarlo a la papelera lo saca del listado", async ({ page }) => {
  test.setTimeout(90_000);
  const id = await createEvent(page, "Evento E2E Duplicar");
  await page.goto(adminUrl("/eventos?publicacion=draft"));
  const row = page.getByRole("row").filter({ hasText: "Evento E2E Duplicar" });
  await row.getByRole("button", { name: "Duplicar Evento E2E Duplicar" }).click();
  await expect(page).toHaveURL(/\/eventos\/[0-9a-f-]+\?creado=1$/);
  expect(page.url()).not.toContain(id);
  await expect(page.getByRole("heading", { name: "Evento E2E Duplicar (copia)", level: 1 })).toBeVisible();

  await page.goto(adminUrl("/eventos?publicacion=draft"));
  const copy = page.getByRole("row").filter({ hasText: "Evento E2E Duplicar (copia)" });
  await copy.getByRole("button", { name: "Enviar a la papelera Evento E2E Duplicar (copia)" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar a la papelera" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Evento E2E Duplicar (copia)" })).toHaveCount(0);
});

test("en un celular (táctil) el armador y el formulario caben sin scroll horizontal", async ({ browser }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await signInAsAdmin(page);

  const id = await createEvent(page, "Evento E2E Móvil");
  await expectNoHorizontalScroll(page);

  await page.goto(adminUrl(`/eventos/${id}/cartelera`));
  await addSegment(page, "Estelar");
  await addBout(page, "Estelar", "Cartel Siete", "Cartel Ocho");
  await expectNoHorizontalScroll(page);

  await context.close();
});
