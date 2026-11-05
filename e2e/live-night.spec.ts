import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";
import { createE2eCard } from "./fixtures/events";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

const current = (page: Page) => page.getByRole("region", { name: "Pelea actual" });

/** Guarda con el botón fijo de abajo y espera a que termine la server action (recargar antes la cancelaría a medias). */
async function save(page: Page, label: string) {
  const done = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/en-vivo"));
  await page.getByRole("button", { name: label }).click();
  await done;
}

/** Abre la noche con el botón y espera a que el servidor ponga el evento en vivo (recargar antes lo cancelaría). */
async function openNight(page: Page) {
  const started = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/en-vivo"));
  await page.getByRole("button", { name: "Abrir la noche de pelea" }).click();
  await started;
}

test("noche de pelea en el celular: abre el evento en vivo, guarda tres resultados seguidos y avanza sola", async ({ browser }) => {
  test.setTimeout(120_000);
  const card = await createE2eCard("Noche E2E Vivo", {
    "Cartelera estelar": [["uno", "dos"]],
    Preliminares: [
      ["tres", "cuatro"],
      ["cinco", "seis"],
    ],
  });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await signInAsAdmin(page);

  // El evento es dentro de años: abrir la consola no lo pone en vivo, hay que abrir la noche a propósito.
  await page.goto(adminUrl(`/eventos/${card.eventId}/en-vivo`));
  await expect(page.getByRole("button", { name: "Abrir la noche de pelea" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Pelea actual" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Abrir la noche de pelea" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await openNight(page);
  await expect(page.getByRole("main").getByText("● EN VIVO")).toBeVisible();
  await expect(page.getByRole("main").getByText("Pelea 1 de 3")).toBeVisible();
  // Las preliminares se pelean primero (la última de la lista antes que la anterior) y la estelar cierra la noche.
  await expect(current(page)).toContainText("Cartel Cinco");
  await expectNoHorizontalScroll(page);

  // Sin elegir nada, el error sale y no se guarda.
  await page.getByRole("button", { name: "Guardar y siguiente" }).click();
  await expect(current(page).getByRole("alert").filter({ hasText: "Elige el resultado" })).toBeVisible();

  // 1.ª: gana la roja por decisión unánime (no pide round ni tiempo).
  await current(page).getByRole("button", { name: "ROJA · Cinco" }).click();
  await current(page).getByRole("button", { name: "Decisión", exact: true }).click();
  await expect(current(page).getByText("Tiempo del round")).toHaveCount(0);
  await current(page).getByRole("button", { name: "Unánime" }).click();
  await save(page, "Guardar y siguiente");
  await expect(current(page)).toContainText("Cartel Tres");
  await expect(page.getByRole("main").getByText("Pelea 2 de 3")).toBeVisible();

  // 2.ª: gana la azul por KO en el round 2, a 1:42 (teclado numérico).
  await current(page).getByRole("button", { name: "AZUL · Cuatro" }).click();
  await current(page).getByRole("button", { name: "KO/TKO", exact: true }).click();
  await current(page).getByRole("button", { name: "KO", exact: true }).click();
  await current(page).getByRole("button", { name: "Round 2" }).click();
  for (const digit of ["1", "4", "2"]) await current(page).getByRole("button", { name: digit, exact: true }).click();
  await expect(current(page).getByLabel("Tiempo escrito")).toHaveText("1:42");
  await save(page, "Guardar y siguiente");
  await expect(current(page)).toContainText("Cartel Uno");
  await expect(page.getByRole("button", { name: "Guardar y terminar la noche" })).toBeVisible();

  // 3.ª (la estelar, la última): empate dividido.
  await current(page).getByRole("button", { name: "EMPATE" }).click();
  await current(page).getByRole("button", { name: "Decisión", exact: true }).click();
  await current(page).getByRole("button", { name: "Dividida" }).click();
  await save(page, "Guardar y terminar la noche");
  await expect(page.getByRole("main").getByText("La noche terminó")).toBeVisible();

  // Lo guardado sigue ahí al recargar, con las líneas de resultado, y el evento quedó finalizado.
  await page.reload();
  await expect(page.getByRole("main").getByText("La noche terminó")).toBeVisible();
  await expect(page.getByRole("main").getByText("Finalizado", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Cinco vence a Seis · Decisión unánime")).toBeVisible();
  await expect(page.getByRole("main").getByText("Cuatro vence a Tres · KO · R2 1:42")).toBeVisible();
  await expect(page.getByRole("main").getByText("Uno y Dos empatan · Decisión dividida")).toBeVisible();
  await expectNoHorizontalScroll(page);

  // El sitio público muestra los tres resultados (las peleas de cada bloque, en su pestaña) y el evento ya es «Pasado».
  const visitor = await browser.newContext();
  const site = await visitor.newPage();
  await site.goto(`/eventos/${card.slug}`);
  await expect(site.getByRole("main").getByText("Uno y Dos empatan · Decisión dividida")).toBeVisible();
  await site.getByRole("tab", { name: "Preliminares" }).click();
  await expect(site.getByRole("main").getByText("Cuatro vence a Tres · KO · R2 1:42")).toBeVisible();
  await expect(site.getByRole("main").getByText("Cinco vence a Seis · Decisión unánime")).toBeVisible();
  await visitor.close();

  // Corregir desde la lista: abre el formulario completo con lo guardado.
  await page.getByRole("button", { name: "Corregir el resultado de Uno vs Dos" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: /Corregir resultado/ })).toBeVisible();
  await expect(page.getByRole("dialog").getByLabel("Tipo de decisión")).toHaveValue("split");
  await context.close();
});

test("noche de pelea: una pelea cancelada se salta y un evento sin peleas lo dice", async ({ browser }) => {
  test.setTimeout(90_000);
  const empty = await createE2eCard("Noche E2E Vacía", {});
  const card = await createE2eCard("Noche E2E Cancelada", { "Cartelera estelar": [["siete", "ocho"]] });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await signInAsAdmin(page);

  await page.goto(adminUrl(`/eventos/${empty.eventId}/en-vivo`));
  await openNight(page);
  await expect(page.getByRole("main").getByText("No hay peleas en la cartelera")).toBeVisible();

  // Cancelar la única pelea desde el armador: la consola ya no tiene qué pelear.
  await page.goto(adminUrl(`/eventos/${card.eventId}/cartelera`));
  await page.getByRole("button", { name: /Más acciones/ }).click();
  await page.getByRole("menuitem", { name: "Cancelar pelea" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar pelea" }).click();
  await expect(page.getByRole("main").getByText("Cancelada", { exact: false }).first()).toBeVisible();

  await page.goto(adminUrl(`/eventos/${card.eventId}/en-vivo`));
  await openNight(page);
  await expect(page.getByRole("main").getByText("Canceladas: Siete vs Ocho.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Pelea actual" })).toHaveCount(0);
  await context.close();
});
