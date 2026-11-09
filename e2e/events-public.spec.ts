import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema/events";
import { createPreviewToken } from "@/features/publication/preview";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";
import { createE2eCard } from "./fixtures/events";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

// Los eventos del seed tienen fechas relativas a hoy: ShowBox Fight Night 1–4 pasados con resultados y ShowBox Fight Night 5 próximo (sábado 21:00).

test("/eventos separa Próximos y Pasados y no desborda", async ({ page }) => {
  await page.goto("/eventos");
  await expect(page.getByRole("heading", { name: "Eventos", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Próximos", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pasados", level: 2 })).toBeVisible();

  const upcoming = page.getByRole("region", { name: "Próximos" });
  const past = page.getByRole("region", { name: "Pasados" });
  await expect(upcoming.locator('[data-event="showbox-fight-night-5"]')).toBeVisible();
  await expect(upcoming.locator('[data-event="showbox-fight-night-4"]')).toHaveCount(0);
  await expect(past.locator('[data-event="showbox-fight-night-4"]')).toBeVisible();
  await expect(past.locator('[data-event="showbox-fight-night-1"]')).toBeVisible();
  await expect(past.locator('[data-event="showbox-fight-night-5"]')).toHaveCount(0);

  // La tarjeta muestra el combate estelar y lleva a la página del evento.
  await expect(upcoming.locator('[data-event="showbox-fight-night-5"]')).toContainText("Cevallos vs Quiñónez");
  await upcoming.getByRole("link", { name: "ShowBox Fight Night 5" }).click();
  await expect(page).toHaveURL(/\/eventos\/showbox-fight-night-5$/);

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/eventos");
    await expectNoHorizontalScroll(page);
  }
});

test("/eventos/showbox-fight-night-5: careo, cartelera por bloques, horarios y barra fija", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-5");
  await expect(page.getByRole("heading", { name: /Cevallos\s*VS\s*Quiñónez/, level: 1 })).toBeVisible();
  await expect(page.getByText("21:00 hrs").first()).toBeVisible();
  await expect(page.getByText("Pelea por el título").first()).toBeVisible();

  // Arriba del título solo van el nombre del evento y su estado.
  const tags = page.locator("#event-hero .sb-hero-billing > *");
  await expect(tags).toHaveText(["ShowBox Fight Night 5", "Próximo"]);

  // La cuenta regresiva se arma al hidratar (el servidor no conoce la hora del navegador).
  const cells = page.locator("[data-countdown]");
  await expect(cells).toHaveCount(4);
  await expect(cells.first()).toHaveText(/^\d{2}$/);

  // Cartelera: pestañas por bloque, la estelar primero, con la pelea de peso pactado en Preliminares.
  const tabs = page.getByRole("tab");
  await expect(tabs.nth(0)).toHaveText("Cartelera estelar");
  await expect(tabs.nth(1)).toHaveText("Preliminares");
  const main = page.getByRole("tabpanel").locator("[data-bout]").first();
  await expect(main).toContainText("Bryan Cevallos");
  await expect(main).toContainText("Jordan Quiñónez");
  await expect(main).toContainText("12 × 3 MIN");
  await expect(main).toContainText("Peso Superligero");
  // Pelea sin resultado todavía: sin etiqueta de victoria ni línea de resultado.
  await expect(main.locator("[data-result-line]")).toHaveCount(0);
  await tabs.nth(1).click();
  await expect(page.getByRole("tabpanel").getByText("Peso pactado 65.0 kg")).toBeVisible();

  // Los boxeadores públicos llevan a su ficha.
  await expect(page.getByRole("tabpanel").getByRole("link", { name: "Kevin Andrango" })).toHaveAttribute("href", "/boxeadores/kevin-andrango");

  // Horarios y lugar.
  const schedule = page.locator('[data-slot="event-schedule"]');
  await expect(schedule).toContainText("Apertura de puertas");
  await expect(schedule).toContainText("19:30 hrs");
  await expect(schedule).toContainText("Cartelera estelar");
  await expect(schedule).toContainText("21:30 hrs");
  await expect(schedule).toContainText("Quorum Paseo San Francisco");
  await expect(page.getByTitle("Mapa de Quorum Paseo San Francisco")).toHaveAttribute("src", /^https:\/\/www\.google\.com\/maps\?q=.*output=embed/);
  await expect(page.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\//);

  // La barra fija aparece tras pasar el hero y sale del orden de foco mientras no se ve.
  const bar = page.locator('[data-slot="event-sticky-bar"]');
  await expect(bar).toHaveAttribute("data-visible", "false");
  await expect(bar).toHaveAttribute("inert", "");
  await page.locator("#cartelera").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.getElementById("cartelera")!.offsetTop + 200));
  await expect(bar).toHaveAttribute("data-visible", "true");
  await expect(bar).not.toHaveAttribute("inert", "");
  await expect(bar).toContainText("ShowBox Fight Night 5");
  await expect(bar.getByRole("link", { name: "Entradas" })).toHaveAttribute("href", /example\.com\/entradas\/showbox-fight-night-5/);
});

test("un evento pasado muestra los resultados de cada pelea, sin cuenta regresiva ni entradas", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-4");
  await expect(page.getByRole("heading", { name: /Quiñónez\s*VS\s*Andrango/, level: 1 })).toBeVisible();
  await expect(page.locator("#event-hero .sb-hero-billing > *")).toHaveText(["ShowBox Fight Night 4", "Finalizado"]);
  await expect(page.locator("[data-countdown]")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: "Comprar entradas" })).toHaveCount(0);

  const main = page.getByRole("tabpanel").locator("[data-bout]").first();
  await expect(main.locator("[data-result-line]")).toHaveText("Quiñónez vence a Andrango · KO · R7 2:03");
  await expect(main.locator('[data-corner="red"] [data-result="win"]')).toHaveText("Victoria");
  await expect(main.locator('[data-corner="blue"] [data-result="win"]')).toHaveCount(0);

  const results = page.locator("[data-result-line]");
  await expect(results.filter({ hasText: "Valencia vence a Mina · Decisión unánime" })).toHaveCount(1);
  await page.getByRole("tab", { name: "Preliminares" }).click();
  await expect(results.filter({ hasText: "Chalá vence a Ortiz · Descalificación (Golpes bajos reiterados) · R4 0:58" })).toHaveCount(1);

  // Empate y sin resultado se distinguen de una victoria.
  await page.goto("/eventos/showbox-fight-night-2");
  await page.getByRole("tab", { name: "Preliminares" }).click();
  await expect(page.locator("[data-bout]").filter({ hasText: "Empate" }).locator('[data-result="none"]')).toHaveText("Empate");
  await page.goto("/eventos/showbox-fight-night-3");
  await page.getByRole("tab", { name: "Preliminares" }).click();
  await expect(page.getByText("Caicedo vs Pazmiño · Sin resultado (falta accidental)")).toBeVisible();

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/eventos/showbox-fight-night-4");
    await expectNoHorizontalScroll(page);
  }
});

test("un evento que no existe, uno en borrador y uno en la papelera no se ven; la vista previa firmada sí muestra el borrador", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/eventos/no-existe");
  await expect(page.getByRole("heading", { name: "Evento no encontrado" })).toBeVisible();

  const draft = await createE2eCard("Evento E2E Borrador Público", { "Cartelera estelar": [["uno", "dos"]] }, { status: "draft" });
  await page.goto(`/eventos/${draft.slug}`);
  await expect(page.getByRole("heading", { name: "Evento no encontrado" })).toBeVisible();
  // El de `global-setup` (el de este spec se crea con la lista ya en caché): si el filtro fallara, saldría en «Próximos».
  await page.goto("/eventos");
  await expect(page.getByRole("heading", { name: "Próximos", level: 2 })).toBeVisible();
  await expect(page.locator('[data-event="evento-e2e-borrador-listados"]')).toHaveCount(0);

  // Vista previa: con la firma correcta se ve (avisando y sin indexar); con la de otro evento no.
  const token = createPreviewToken("event", draft.eventId);
  await page.goto(`/eventos/${draft.slug}?preview=${token}`);
  await expect(page.getByRole("heading", { name: /Uno\s*VS\s*Dos/, level: 1 })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Vista previa" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto(`/eventos/${draft.slug}?preview=${createPreviewToken("event", "00000000-0000-4000-8000-000000000000")}`);
  await expect(page.getByRole("heading", { name: "Evento no encontrado" })).toBeVisible();
  await page.goto(`/eventos/${draft.slug}?preview=inventado`);
  await expect(page.getByRole("heading", { name: "Evento no encontrado" })).toBeVisible();

  const trashed = await createE2eCard("Evento E2E Papelera Público", { "Cartelera estelar": [["tres", "cuatro"]] });
  await page.goto(`/eventos/${trashed.slug}`);
  await expect(page.getByRole("heading", { name: /Tres\s*VS\s*Cuatro/, level: 1 })).toBeVisible();
  // Enviarlo a la papelera desde el panel lo saca del sitio al instante (la caché se invalida en la action).
  await signInAsAdmin(page);
  await page.goto(adminUrl("/eventos?publicacion=published"));
  await page.getByRole("row").filter({ hasText: "Evento E2E Papelera Público" }).getByRole("button", { name: "Enviar a la papelera Evento E2E Papelera Público" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar a la papelera" }).click();
  // Se espera el aviso de la action: mientras la lista se recarga la fila desaparece un instante aunque aún no se haya enviado.
  await expect(page.getByText("Enviado a la papelera").first()).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Evento E2E Papelera Público" })).toHaveCount(0);
  await page.goto(`/eventos/${trashed.slug}`);
  await expect(page.getByRole("heading", { name: "Evento no encontrado" })).toBeVisible();
});

test("mientras el evento está en vivo la página pública muestra cada resultado en segundos, sin recargar", async ({ browser }) => {
  test.setTimeout(150_000);
  const card = await createE2eCard("Evento E2E En Vivo Público", { "Cartelera estelar": [["cinco", "seis"]], Preliminares: [["siete", "ocho"]] });

  const admin = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const panel = await admin.newPage();
  await signInAsAdmin(panel);
  // Un evento lejano no se pone en vivo por abrir la consola: se abre la noche con el botón y se espera la respuesta de la
  // action (la insignia «EN VIVO» de la consola se muestra antes, sin esperar al servidor) para que el sitio ya cargue en vivo.
  await panel.goto(adminUrl(`/eventos/${card.eventId}/en-vivo`));
  const started = panel.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/en-vivo"));
  await panel.getByRole("button", { name: "Abrir la noche de pelea" }).click();
  await started;
  await expect(panel.getByRole("main").getByText("● EN VIVO")).toBeVisible();

  // El evento ya está en vivo: la página pública lo dice y se refresca sola.
  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  await page.goto(`/eventos/${card.slug}`);
  await expect(page.getByText("EN VIVO").first()).toBeVisible();
  await page.getByRole("tab", { name: "Preliminares" }).click();
  await expect(page.locator("[data-result-line]")).toHaveCount(0);

  const saved = panel.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/en-vivo"));
  const region = panel.getByRole("region", { name: "Pelea actual" });
  await region.getByRole("button", { name: "ROJA · Siete" }).click();
  await region.getByRole("button", { name: "Decisión", exact: true }).click();
  await region.getByRole("button", { name: "Unánime" }).click();
  await panel.getByRole("button", { name: "Guardar y siguiente" }).click();
  await saved;

  // La página se refresca sola cada 20 s mientras está en vivo (el margen del timeout cubre un servidor de desarrollo cargado).
  await expect(page.locator("[data-result-line]")).toHaveText("Siete vence a Ocho · Decisión unánime", { timeout: 60_000 });
  await admin.close();
  await visitor.close();
});

test("una pelea tiene su página con todo el detalle y, al final, las tarjetas de los jueces", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-1");
  const bout = page.locator("[data-bout]").filter({ hasText: "Quiñónez vence a Andrango" });
  // Una decisión no lleva round ni tiempo: llegó al final.
  await expect(bout.locator("[data-result-line]")).toHaveText("Quiñónez vence a Andrango · Decisión unánime");

  await bout.getByRole("button", { name: /Ver datos/ }).click();
  await bout.getByRole("link", { name: /Ver la pelea y las tarjetas/ }).click();
  await expect(page).toHaveURL(/\/eventos\/showbox-fight-night-1\/peleas\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /Quiñónez\s*vs\s*Andrango/i, level: 1 })).toBeVisible();
  await expect(page.locator('[data-corner="red"] [data-result="win"]')).toHaveText("Victoria");
  // Igual que en la cartelera: «Victoria» va sobre los pies de la foto y la silueta entra entera (sin cortar la cabeza).
  const face = page.locator('[data-corner="red"] [data-slot="bout-face"]');
  const faceBox = (await face.boundingBox())!;
  const winBox = (await face.locator('[data-result="win"]').boundingBox())!;
  expect(winBox.y + winBox.height).toBeLessThanOrEqual(faceBox.y + faceBox.height);
  expect(winBox.y + winBox.height).toBeGreaterThanOrEqual(faceBox.y + faceBox.height - 8);
  expect(winBox.height).toBeLessThan(faceBox.height / 5);
  const blueFace = page.locator('[data-corner="blue"] [data-slot="bout-face"]');
  expect((await blueFace.locator("svg").boundingBox())!.y).toBeGreaterThanOrEqual((await blueFace.boundingBox())!.y);
  await expect(page.locator('[data-slot="bout-result"]')).toContainText("Gana Jordan Quiñónez");
  // En celular cada dato del resultado (método, dónde terminó, árbitro) va centrado, uno bajo otro.
  await page.setViewportSize({ width: 390, height: 844 });
  const resultBox = (await page.locator('[data-slot="bout-result"] dl').boundingBox())!;
  for (const item of await page.locator('[data-slot="bout-result"] dl > div').all()) {
    const box = (await item.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - (resultBox.x + resultBox.width / 2))).toBeLessThanOrEqual(2);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('[data-slot="bout-result"]')).toContainText("Decisión unánime");
  await expect(page.locator('[data-slot="bout-result"]')).toContainText("Ricardo Salazar");

  const judge = page.getByRole("table", { name: "Tarjeta de Juez 3" });
  const total = judge.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Total" }) });
  await expect(total.getByRole("cell")).toHaveText(["79", "73"]);
  // Anotada round por round: cada round con los dos puntajes.
  const round2 = judge.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "2", exact: true }) });
  await expect(round2.getByRole("cell")).toHaveText(["10", "", "", "8"]);
  // Debajo de las tarjetas, el resultado con los puntajes del ganador primero.
  await expect(page.locator('[data-slot="scorecards-verdict"]')).toContainText("78-74 · 78-74 · 79-73");
  await expectNoHorizontalScroll(page);

  await page.goto("/eventos/showbox-fight-night-1/peleas/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "Pelea no encontrada" })).toBeVisible();
});

test("a su hora de inicio el evento sale «en vivo» solo, sin que nadie lo marque en el panel", async ({ page }) => {
  // En borrador y visto con la vista previa: un evento publicado que empezó hace una hora sería el «próximo» de la home y de
  // `/eventos`, y les cambiaría la portada a los otros specs que corren a la vez.
  const card = await createE2eCard("Evento E2E En Vivo Automático", { "Cartelera estelar": [["cinco", "seis"]] }, { status: "draft" });
  // Empezó hace una hora y sigue «Programado» en la base: nadie abrió la noche de pelea.
  await db.update(events).set({ startsAt: new Date(Date.now() - 60 * 60 * 1000), eventStatus: "scheduled" }).where(eq(events.id, card.eventId));

  await page.goto(`/eventos/${card.slug}?preview=${createPreviewToken("event", card.eventId)}`);
  await expect(page.getByRole("region", { name: /Cinco\s*VS\s*Seis/ }).getByText("● En vivo")).toBeVisible();
  await expect(page.getByText("EN VIVO").first()).toBeVisible();
});
