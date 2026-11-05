import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

async function png(width: number, height: number, color: string): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

function section(page: Page, heading: string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: heading }) });
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(adminUrl("/medios"));
  await expect(page.getByRole("heading", { name: "Prueba de imágenes" })).toBeVisible();
});

test("subir una foto de cuerpo completo, recortarla y guardarla", async ({ page }) => {
  const field = section(page, "Foto de cuerpo completo");
  // Antes de elegir el archivo ya se ve qué subir: proporción y píxeles.
  await expect(field.getByText("Proporción 2:3 (vertical) · Recomendado: 1200×1800 px · Mínimo: 800×1200 px")).toBeVisible();
  await field.locator('input[type="file"]').setInputFiles({ name: "boxeador.png", mimeType: "image/png", buffer: await png(1200, 1800, "#c33") });

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Proporción 2:3 (vertical) · Recomendado: 1200×1800 px · Mínimo: 800×1200 px")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Quitar fondo" })).toBeVisible();
  await expect(dialog.getByText(/más chica que el mínimo/)).toHaveCount(0);
  for (const adjustment of ["Brillo", "Contraste", "Saturación", "Nitidez"]) {
    await expect(dialog.getByLabel(adjustment)).toBeVisible();
  }
  await dialog.getByLabel("Nitidez").fill("1");
  await dialog.getByLabel("Texto alternativo").fill("Boxeador de prueba");
  await dialog.getByRole("button", { name: "Guardar imagen" }).click();

  await expect(dialog).toBeHidden();
  const thumbnail = field.getByRole("img", { name: "Boxeador de prueba" });
  await expect(thumbnail).toBeVisible();
  await expect.poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(field.locator('input[name="fighterBody"]')).toHaveValue(/^[0-9a-f-]{36}$/);
  await expect(thumbnail).toHaveAttribute("srcset", /400\.webp 400w, .*800\.webp 800w, .*1200\.webp 1200w/);
});

test("avisa cuando la imagen es más chica que el mínimo pero deja continuar", async ({ page }) => {
  const field = section(page, "Foto de cuerpo completo");
  await field.locator('input[type="file"]').setInputFiles({ name: "chica.png", mimeType: "image/png", buffer: await png(700, 1050, "#369") });

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("La imagen es más chica que el mínimo recomendado (800×1200) y puede verse pixelada."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Guardar imagen" }).click();
  await expect(field.locator('input[name="fighterBody"]')).toHaveValue(/^[0-9a-f-]{36}$/);
});

test("acepta fotos AVIF y lo dice junto a los demás formatos (también HEIC)", async ({ page }) => {
  const field = section(page, "Foto de cuerpo completo");
  await expect(field.getByText(/JPG, PNG, WebP, AVIF o HEIC/)).toBeVisible();
  await expect(field.locator('input[type="file"]')).toHaveAttribute("accept", /image\/avif.*\.heic/);
  const avif = await sharp({ create: { width: 1200, height: 1800, channels: 3, background: "#363" } }).avif().toBuffer();
  await field.locator('input[type="file"]').setInputFiles({ name: "boxeador.avif", mimeType: "image/avif", buffer: avif });

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Guardar imagen" })).toBeVisible();
  await dialog.getByRole("button", { name: "Guardar imagen" }).click();
  await expect(dialog).toBeHidden();
  await expect(field.locator('input[name="fighterBody"]')).toHaveValue(/^[0-9a-f-]{36}$/);
});

test("rechaza formatos no permitidos con un mensaje claro", async ({ page }) => {
  const field = section(page, "Foto de cuerpo completo");
  await field.locator('input[type="file"]').setInputFiles({ name: "animacion.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });

  await expect(field.getByText("Formato no permitido")).toBeVisible();
});

test("un logo SVG con script se guarda sanitizado", async ({ page }) => {
  const field = section(page, "Logo del patrocinador");
  const dirty = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><script>alert(1)</script><rect width="200" height="100" onclick="x()"/></svg>';
  await field.locator('input[type="file"]').setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from(dirty) });

  // Sin texto alternativo el rol es "presentation": se busca por etiqueta.
  const image = field.locator("img");
  await expect(image).toBeVisible();
  const url = await image.getAttribute("src");
  const stored = await (await page.request.get(url!)).text();
  expect(stored).not.toContain("<script");
  expect(stored).not.toContain("onclick");
});

test("galería: subir varias fotos y reordenarlas con los botones", async ({ page }) => {
  const field = section(page, "Galería");
  await field.locator('input[type="file"]').setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: await png(1300, 900, "#c33") },
    { name: "b.png", mimeType: "image/png", buffer: await png(1300, 900, "#3c3") },
  ]);

  const inputs = field.locator('input[name="gallery"]');
  await expect(inputs).toHaveCount(2);
  const [first, second] = await inputs.evaluateAll((nodes) => nodes.map((node) => (node as HTMLInputElement).value));

  await field.getByRole("button", { name: "Bajar foto 1" }).click();

  await expect(inputs.nth(0)).toHaveValue(second);
  await expect(inputs.nth(1)).toHaveValue(first);
});

test.describe("en celular", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("el editor se usa sin scroll horizontal y con botones táctiles de 44 px", async ({ page }) => {
    await expectNoHorizontalScroll(page);

    const field = section(page, "Foto de cuerpo completo");
    await field.locator('input[type="file"]').setInputFiles({ name: "boxeador.png", mimeType: "image/png", buffer: await png(1200, 1800, "#c33") });

    const dialog = page.getByRole("dialog");
    const save = dialog.getByRole("button", { name: "Guardar imagen" });
    await expect(save).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect((await save.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    await dialog.getByRole("button", { name: "Punto de enfoque" }).click();
    await expect(dialog.getByTestId("focal-picker")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
