import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("la ficha de Bryan Cevallos muestra apodo, nombre, país, peso y récord manual", async ({ page }) => {
  const response = await page.goto("/boxeadores/bryan-cevallos");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { name: "Bryan Cevallos", level: 1 })).toBeVisible();
  await expect(page.getByText("“El Martillo”")).toBeVisible();
  await expect(page.getByText("70.3 kg / 155 lb").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "Chile" }).first()).toBeVisible();
  await expect(page.locator('[data-level="pro"]').getByText("12-2-0")).toBeVisible();
  await expect(page).toHaveTitle(/Bryan Cevallos/);
  // Un solo h1 por página.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("sin foto muestra la silueta de la marca en el hero", async ({ page }) => {
  await page.goto("/boxeadores/bryan-cevallos");
  await expect(page.locator('section [data-slot="fighter-silhouette"]').first()).toBeVisible();
});

test("la bio breve va en la tarjeta y las pestañas son Datos y Redes", async ({ page }) => {
  await page.goto("/boxeadores/bryan-cevallos");
  await expect(page.locator('[data-slot="fighter-bio"]')).toContainText("Campeón peso ligero.");
  await expect(page.locator('[data-slot="fighter-bio"]')).toBeVisible();
  // En un celular bajo la bio sale de la portada y va justo debajo.
  await page.setViewportSize({ width: 390, height: 664 });
  await expect(page.locator('[data-slot="fighter-bio"]')).toBeHidden();
  await expect(page.locator('[data-slot="fighter-bio-below"]')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByRole("tab", { name: "Bio" })).toHaveCount(0);

  // Datos se ve de entrada, sin pulsar nada.
  await expect(page.getByRole("tab", { name: "Datos" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Rancagua")).toBeVisible();
  await expect(page.getByText("180 cm / 5'11\"")).toBeVisible();
  await expect(page.getByText(/años \(nació el/)).toBeVisible();
  await expect(page.getByText("Ortodoxo")).toBeVisible();

  await page.getByRole("tab", { name: "Redes" }).click();
  await expect(page.getByText("Este boxeador aún no comparte sus redes.")).toBeVisible();
  await expect(page.getByText("Rancagua")).toHaveCount(0);
  await page.getByRole("tab", { name: "Datos" }).click();
  await expect(page.getByText("Rancagua")).toBeVisible();
});

test("el récord solo muestra lo que tiene datos: sin amateur ni peleas en GC no aparecen", async ({ page }) => {
  await page.goto("/boxeadores/bryan-cevallos");
  const pro = page.locator('[data-level="pro"]');
  await expect(pro.locator('[data-record="total"]')).toContainText("12-2-0");
  await expect(page.locator('[data-record="gc"]')).toHaveCount(0);
  await expect(page.locator('[data-level="amateur"]')).toHaveCount(0);
  await expect(page.getByText(/Sin peleas|Sin datos/)).toHaveCount(0);
});

test("en celular la foto no se mueve con el scroll y no invade el texto de abajo", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 700 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/boxeadores/bryan-cevallos");
  // La capa que se mueve con el parallax (dentro va la foto o la silueta).
  const photo = page.locator('[data-slot="fighter-hero-photo"] > div').first();
  await expect(photo).toBeVisible();
  // La foto no ocupa toda la pantalla: el nombre se lee sin desplazarse.
  await expect(page.getByRole("heading", { name: "Bryan Cevallos", level: 1 })).toBeInViewport();
  for (const y of [0, 250, 450]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(300);
    expect(await photo.evaluate((element) => (element as HTMLElement).style.transform)).toBe("");
  }
  // El contenedor recorta la foto: nada se sale por debajo hacia las etiquetas.
  const overflow = await photo.evaluate((element) => getComputedStyle(element.parentElement as HTMLElement).overflow);
  expect(overflow).toBe("hidden");
  await context.close();
});

test("en escritorio el parallax es suave, con tope, y la foto queda recortada", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/boxeadores/bryan-cevallos");
  // La capa que se mueve con el parallax (dentro va la foto o la silueta).
  const photo = page.locator('[data-slot="fighter-hero-photo"] > div').first();
  // El parallax solo corre mientras el hero se ve: se hace scroll dentro de él, poco a poco, hasta que responda.
  await expect
    .poll(async () => {
      await page.mouse.wheel(0, 200);
      return photo.evaluate((element) => (element as HTMLElement).style.transform);
    })
    .toMatch(/translate3d\(0px, [1-9]\d*px, 0px\)/);
  await page.evaluate(() => window.scrollTo(0, 600));
  const shift = Number((await photo.evaluate((element) => (element as HTMLElement).style.transform)).match(/, (\d+)px/)?.[1]);
  expect(shift).toBeLessThanOrEqual(60);
  expect(await photo.evaluate((element) => getComputedStyle(element.parentElement as HTMLElement).overflow)).toBe("hidden");
});

test("las cifras del hero traen su valor final aunque se pida reducir el movimiento", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/boxeadores/bryan-cevallos");
  await expect(page.locator('section [data-count="12"]').first()).toHaveText("12");
  await expect(page.locator('section [data-count="2"]').first()).toHaveText("2");
  await context.close();
});

test("un enlace que no existe responde 404 con un mensaje útil", async ({ page }) => {
  const response = await page.goto("/boxeadores/no-existe-nadie");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Boxeador no encontrado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver boxeadores" })).toBeVisible();
});

test("un borrador y un boxeador en la papelera responden 404 y no están en el listado", async ({ page }) => {
  for (const slug of ["borrador-oculto", "papelera-oculta"]) {
    const response = await page.goto(`/boxeadores/${slug}`);
    expect(response?.status()).toBe(404);
  }
  await page.goto("/boxeadores?q=oculto");
  await expect(page.getByText("Sin resultados")).toBeVisible();
});

test("el borrador se ve con el enlace de vista previa del panel y sin él sigue oculto", async ({ page, context }) => {
  await signInAsAdmin(page);
  await page.goto(adminUrl("/boxeadores?q=borrador"));
  await page.getByRole("link", { name: "Editar Borrador Oculto" }).click();
  await page.getByRole("tab", { name: "Publicación" }).click();

  const [preview] = await Promise.all([context.waitForEvent("page"), page.getByRole("button", { name: /Vista previa/ }).click()]);
  await preview.waitForLoadState();
  // La vista previa se abre en el sitio público, no en el subdominio del panel.
  await expect(preview).toHaveURL(/^http:\/\/localhost:\d+\/boxeadores\/borrador-oculto\?preview=/);
  await expect(preview.getByRole("heading", { name: "Borrador Oculto", level: 1 })).toBeVisible();
  await expect(preview.getByRole("status").filter({ hasText: "Vista previa" })).toBeVisible();
  await expect(preview.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // El mismo enlace con el token alterado no abre nada.
  const tampered = preview.url().replace(/preview=([^.]+)\./, "preview=x$1.");
  expect((await page.goto(tampered))?.status()).toBe(404);
});

for (const width of [320, 375, 768, 1440]) {
  test(`la ficha no tiene scroll horizontal a ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/boxeadores/bryan-cevallos");
    await expect(page.getByRole("heading", { name: "Bryan Cevallos", level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
