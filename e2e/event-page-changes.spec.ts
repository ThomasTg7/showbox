import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";
import { createE2eCard } from "./fixtures/events";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Espera a que React haya enganchado la cartelera: un clic antes de hidratar no hace nada (con el servidor cargado pasa). */
async function waitForHydratedCard(page: Page) {
  await page.waitForFunction(() => {
    const button = document.querySelector("[data-bout] button");
    return button !== null && Object.keys(button).some((key) => key.startsWith("__reactProps"));
  });
}

const top = (locator: ReturnType<Page["locator"]>) => locator.evaluate((element) => Math.round(element.getBoundingClientRect().top));

test("«Ver cartelera» se desliza hasta la cartelera en vez de saltar", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-5");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const link = document.querySelector('#event-hero a[href="#cartelera"]');
    return link !== null && Object.keys(link).some((key) => key.startsWith("__reactProps"));
  });
  const target = await page.evaluate(() => document.getElementById("cartelera")!.getBoundingClientRect().top + window.scrollY);
  await page.locator("#event-hero").getByRole("link", { name: "Ver cartelera" }).click();

  // Un salto daría 0 y luego el destino; deslizando hay posiciones intermedias.
  await page.waitForFunction(() => window.scrollY > 40);
  const midway = await page.evaluate(() => window.scrollY);
  expect(midway).toBeLessThan(target - 5);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 10_000 }).toBeGreaterThanOrEqual(Math.round(target) - 4);
});

test("las pestañas de bloque usan rojo ShowBox y la activa cambia de color", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-5");
  const estelar = page.getByRole("tab", { name: "Cartelera estelar" });
  const prelim = page.getByRole("tab", { name: "Preliminares" });
  const background = (tab: typeof estelar) => tab.evaluate((element) => getComputedStyle(element).backgroundColor);
  // Inactiva: rojo ShowBox con texto blanco. Activa: negra.
  await expect.poll(() => background(prelim)).toBe("rgb(227, 16, 31)");
  await expect.poll(() => background(estelar)).not.toBe("rgb(227, 16, 31)");
  await prelim.click();
  await expect.poll(() => background(estelar)).toBe("rgb(227, 16, 31)");
  await expect.poll(() => background(prelim)).not.toBe("rgb(227, 16, 31)");
});

test("tocar una pelea despliega los datos de los dos; abrir otra cierra la anterior; un enlace no la abre", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-5");
  await waitForHydratedCard(page);
  const bouts = page.getByRole("tabpanel").locator("[data-bout]");
  const first = bouts.first();
  await expect(first).toHaveAttribute("data-open", "false");

  // Tocar la pelea (no un enlace) la abre.
  await first.locator('[data-slot="bout-billing"]').click();
  await expect(first).toHaveAttribute("data-open", "true");

  // Al medio el dato y a los lados el valor de cada uno, en la misma fila. El alcance está en Cevallos y Quiñónez.
  const rows = first.locator('[data-slot="bout-comparison"] tbody tr');
  await expect(rows.nth(0).locator("th")).toHaveText("Récord");
  await expect(rows.nth(0).locator("td").first()).toHaveText("14-1-0");
  await expect(rows.nth(0).locator("td").last()).toHaveText("12-1-1");
  await expect(rows.filter({ hasText: "País" }).locator("td")).toHaveText(["Ecuador", "Ecuador"]);
  await expect(rows.filter({ hasText: "Altura" }).locator("td")).toHaveText(["175 cm", "177 cm"]);
  await expect(rows.filter({ hasText: "Peso" }).locator("td")).toHaveText(["63.5 kg", "63.5 kg"]);
  await expect(rows.filter({ hasText: "Alcance" }).locator("td")).toHaveText(["180 cm", "183 cm"]);
  const cellTops = await rows.nth(0).locator("td, th").evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().top)));
  expect(new Set(cellTops).size).toBe(1);

  // Abrir otra cierra la primera; a una pelea donde a alguien le falta el alcance no se le muestra esa fila.
  await bouts.nth(1).getByRole("button", { name: /Ver datos/ }).click();
  await expect(bouts.nth(1)).toHaveAttribute("data-open", "true");
  await expect(first).toHaveAttribute("data-open", "false");
  await expect(bouts.nth(1).locator('[data-slot="bout-comparison"] tbody tr').filter({ hasText: "Alcance" })).toHaveCount(0);

  // Tocar el nombre de un boxeador va a su ficha.
  await page.goto("/eventos/showbox-fight-night-5");
  await page.getByRole("tabpanel").locator("[data-bout]").first().getByRole("link", { name: "Bryan Cevallos" }).click();
  await expect(page).toHaveURL(/\/boxeadores\/bryan-cevallos$/);
});

test("el panel de datos se anima: pasa por alturas intermedias al abrirse y al cerrarse", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-5");
  await waitForHydratedCard(page);
  const first = page.getByRole("tabpanel").locator("[data-bout]").first();
  const panel = first.locator('[id]:has([data-slot="bout-comparison"])');
  const height = () => panel.evaluate((element) => element.getBoundingClientRect().height);
  expect(await height()).toBeLessThan(1);

  const samples: number[] = [];
  await first.getByRole("button", { name: /Ver datos/ }).click();
  for (let i = 0; i < 12; i += 1) {
    samples.push(await height());
    await page.waitForTimeout(30);
  }
  const full = samples.at(-1)!;
  expect(full).toBeGreaterThan(100);
  expect(samples.some((value) => value > 1 && value < full - 1)).toBe(true);

  const closing: number[] = [];
  await first.getByRole("button", { name: /Ocultar datos/ }).click();
  for (let i = 0; i < 12; i += 1) {
    closing.push(await height());
    await page.waitForTimeout(30);
  }
  expect(closing.some((value) => value > 1 && value < full - 1)).toBe(true);
  await expect.poll(height).toBeLessThan(1);
});

test("en un evento con resultado, los nombres van al centro en celular y junto a su foto en PC, y «Victoria» va sobre los pies de la foto del ganador", async ({ page }) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/eventos/showbox-fight-night-4");
    const main = page.getByRole("tabpanel").locator("[data-bout]").first();
    await expect(main.locator('[data-corner="red"] [data-result="win"]')).toHaveText("Victoria");
    const red = main.locator('[data-corner="red"] h3');
    const blue = main.locator('[data-corner="blue"] h3');
    // Celular: uno sobre otro al centro de la tarjeta. PC: a la misma altura, cada uno junto a su foto.
    if (width === 375) expect(await top(red)).toBeLessThan(await top(blue));
    else expect(await top(red)).toBe(await top(blue));
    // La etiqueta va sobre la foto del ganador, a sus pies (sobre el borde de color) y sin tapar más de un quinto.
    const winBox = (await main.locator('[data-result="win"]').boundingBox())!;
    const faceBox = (await main.locator('[data-corner="red"] [data-slot="bout-face"]').boundingBox())!;
    const faceBottom = faceBox.y + faceBox.height;
    expect(winBox.y + winBox.height).toBeLessThanOrEqual(faceBottom);
    expect(winBox.y + winBox.height).toBeGreaterThanOrEqual(faceBottom - 6);
    expect(winBox.height).toBeLessThan(faceBox.height / 5);
    expect(winBox.x).toBeGreaterThanOrEqual(faceBox.x - 1);
    expect(winBox.x + winBox.width).toBeLessThanOrEqual(faceBox.x + faceBox.width + 1);
    // La silueta entra completa en el recuadro: no se le corta la cabeza.
    const blueFace = main.locator('[data-corner="blue"] [data-slot="bout-face"]');
    const headBox = (await blueFace.locator("svg").boundingBox())!;
    expect(headBox.y).toBeGreaterThanOrEqual((await blueFace.boundingBox())!.y);
    await expectNoHorizontalScroll(page);
  }
});

test("la ficha del boxeador: próxima pelea con la foto del rival, datos y redes, luego récord e historial", async ({ page }) => {
  await page.goto("/boxeadores/jordan-quinonez");
  const next = page.locator('[data-slot="fighter-next-bout"]');
  await expect(next).toContainText("Próxima pelea");
  await expect(next.locator('[data-slot="opponent-photo"]')).toBeVisible();
  await expect(next.locator('[data-slot="opponent-photo"] [data-slot="fighter-silhouette"], [data-slot="opponent-photo"] img')).toHaveCount(1);

  // Orden: próxima pelea, datos y redes, récord, historial.
  const y = async (selector: string) => top(page.locator(selector).first());
  const info = await y('section[aria-label="Información del boxeador"]');
  const record = await y("#fighter-record-heading");
  const history = await y("#fighter-history-heading");
  expect(await y('[data-slot="fighter-next-bout"]')).toBeLessThan(info);
  expect(info).toBeLessThan(record);
  expect(record).toBeLessThan(history);

  // El récord de GC va debajo del total, y el título centrado.
  const pro = page.locator('[data-level="pro"]');
  const total = (await pro.locator('[data-record="total"]').boundingBox())!;
  const gc = (await pro.locator('[data-record="gc"]').boundingBox())!;
  expect(gc.y).toBeGreaterThan(total.y + total.height - 1);
  const heading = (await page.locator("#fighter-record-heading").boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(heading.x + heading.width / 2 - viewport.width / 2)).toBeLessThan(40);
});

test("la ficha no tiene scroll horizontal con las secciones nuevas", async ({ page }) => {
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/boxeadores/jordan-quinonez");
    await expectNoHorizontalScroll(page);
  }
});

test("al editar un evento se pega un enlace de Google Maps y el mapa de la página pública lo usa", async ({ page }) => {
  test.setTimeout(90_000);
  const card = await createE2eCard("Evento E2E Mapa", { "Cartelera estelar": [["uno", "dos"]] });
  await signInAsAdmin(page);
  await page.goto(adminUrl(`/eventos/${card.eventId}`));
  await page.getByRole("tab", { name: "Horarios y lugar" }).click();
  await expect(page.getByLabel("Latitud (opcional)")).toHaveCount(0);

  // Un enlace que no es de Google Maps se rechaza junto al campo.
  const field = page.getByLabel("Enlace de Google Maps (opcional)");
  await field.fill("https://example.com/maps");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pega un enlace de Google Maps" })).toBeVisible();

  // Con el enlace largo de «Compartir» se guarda el lugar y el mapa público lo muestra.
  await field.fill("https://www.google.com/maps/place/Arena+Santiago/@-33.4400,-70.6600,17z/data=!3d-33.4372!4d-70.6506");
  const saved = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes(`/eventos/${card.eventId}`));
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await saved;
  await expect(page.getByText("Cambios guardados").first()).toBeVisible();

  await page.goto(`/eventos/${card.slug}`);
  await expect(page.getByTitle("Mapa de Arena Santiago")).toHaveAttribute("src", /q=-33\.4372%2C-70\.6506/);

  // Al volver a editar, el campo muestra el lugar guardado como enlace de Google Maps.
  await page.goto(adminUrl(`/eventos/${card.eventId}`));
  await page.getByRole("tab", { name: "Horarios y lugar" }).click();
  await expect(field).toHaveValue(/google\.com\/maps\?q=-33\.4372,-70\.6506/);

  // Vaciarlo quita el mapa.
  await field.fill("");
  const cleared = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes(`/eventos/${card.eventId}`));
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await cleared;
  await expect(page.getByText("Cambios guardados").first()).toBeVisible();
  await page.goto(`/eventos/${card.slug}`);
  await expect(page.getByTitle("Mapa de Arena Santiago")).toHaveCount(0);
});

test("la portada de la ficha ocupa justo la pantalla: ni corta ni larga", async ({ page }) => {
  // 390×664: un iPhone 13 con las barras de Safari a la vista.
  for (const [width, height] of [[390, 664], [375, 667], [393, 780], [1280, 720], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/boxeadores/jordan-quinonez");
    const hero = page.locator('section[aria-labelledby="fighter-name"]');
    await page.evaluate(() => document.fonts.ready);
    await expect(hero.locator('[data-fit-text]')).toHaveCount(2);
    await expect.poll(() => hero.locator('[data-fit-text]').evaluateAll(elements => elements.every(element => element.getAttribute("data-fit-ready") === "true"))).toBe(true);
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    const box = (await hero.boundingBox())!;
    expect(Math.abs(box.height - height), `alto de la portada a ${width}×${height}`).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y)).toBeLessThanOrEqual(1);
    // Nada queda cortado: las cifras (lo último de los datos) terminan dentro de la pantalla.
    const figures = (await hero.getByRole("term").last().boundingBox())!;
    expect(figures.y + figures.height).toBeLessThanOrEqual(height);
    // En celulares bajos se compacta el texto para que la foto no quede chica.
    if (width < 1024) {
      const photo = (await hero.locator('[data-slot="fighter-hero-photo"]').boundingBox())!;
      expect(photo.height, `alto de la foto a ${width}×${height}`).toBeGreaterThanOrEqual(height * 0.42);
    }
  }
});

test("«Récord profesional» va en una línea sobre el récord, y Historial tiene el mismo título que Récord", async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/boxeadores/jordan-quinonez");
    const title = page.locator('[data-level="pro"] h3');
    await expect(title).toHaveText(/Récord profesional/i);
    const lines = await title.evaluate((element) => Math.round(element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight)));
    expect(lines).toBe(1);
    const total = (await page.locator('[data-level="pro"] [data-record="total"]').boundingBox())!;
    expect((await title.boundingBox())!.y).toBeLessThan(total.y);

    const [record, history] = await Promise.all([page.locator("#fighter-record-heading").boundingBox(), page.locator("#fighter-history-heading").boundingBox()]);
    expect(Math.abs(record!.x + record!.width / 2 - (history!.x + history!.width / 2))).toBeLessThan(2);
    expect(Math.abs(await page.locator("#fighter-history-heading").evaluate((element) => parseFloat(getComputedStyle(element).fontSize)) - (await page.locator("#fighter-record-heading").evaluate((element) => parseFloat(getComputedStyle(element).fontSize))))).toBeLessThan(0.5);
    await expectNoHorizontalScroll(page);
  }
});

test("en una pelea por el título se elige en qué esquina está el campeón", async ({ page }) => {
  test.setTimeout(90_000);
  const card = await createE2eCard("Evento E2E Campeón", { "Cartelera estelar": [["uno", "dos"]] });
  await signInAsAdmin(page);
  await page.goto(adminUrl(`/eventos/${card.eventId}/cartelera`));

  const edit = async () => {
    await page.getByRole("button", { name: /Editar la pelea/ }).first().click();
    return page.getByRole("dialog");
  };
  let dialog = await edit();
  // Sin marcar la pelea por el título no se pregunta por el campeón.
  await expect(dialog.getByLabel("¿En qué esquina está el campeón?")).toHaveCount(0);
  await dialog.getByRole("checkbox", { name: /Pelea por el título/ }).check();
  const corner = dialog.getByLabel("¿En qué esquina está el campeón?");
  await expect(corner).toHaveValue("red");
  await expect(corner.locator("option")).toHaveText([/Esquina roja · Cartel Uno/, /Esquina azul · Cartel Dos/]);
  await corner.selectOption("blue");
  await dialog.getByRole("button", { name: "Guardar pelea" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("★ Por el título · campeón: Dos")).toBeVisible();

  // Al volver a abrir queda como se guardó, y se puede devolver a la roja.
  dialog = await edit();
  await expect(dialog.getByLabel("¿En qué esquina está el campeón?")).toHaveValue("blue");
  await dialog.getByLabel("¿En qué esquina está el campeón?").selectOption("red");
  await dialog.getByRole("button", { name: "Guardar pelea" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("★ Por el título · campeón: Uno")).toBeVisible();
});
