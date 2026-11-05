import { expect, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

function imageSection(page: Page, name: string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name, exact: true }) });
}

async function upload(page: Page, section: Locator, name: string, color: string, width: number, height: number) {
  const buffer = await sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
  await section.locator('input[type="file"]').setInputFiles({ name: `${name}.png`, mimeType: "image/png", buffer });
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Texto alternativo").fill(name);
  await dialog.getByRole("button", { name: "Guardar imagen" }).click();
  await expect(dialog).toBeHidden();
  await expect(section.getByRole("img", { name, exact: true })).toBeVisible();
}

for (const width of [375, 1440]) {
  test(`reutiliza afiche y móvil en ambas direcciones y el navegador elige la portada correcta a ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    await signInAsAdmin(page);
    await page.goto(adminUrl("/eventos/nuevo"));
    await page.getByLabel("Nombre del evento").fill(`Imágenes compartidas ${width}`);
    await page.getByRole("tab", { name: "Horarios y lugar" }).click();
    await page.getByLabel("Fecha del evento").fill("2031-07-10");
    await page.getByLabel("Recinto").fill("Arena Santiago");
    await page.getByLabel("Ciudad").fill("Santiago");
    await page.getByLabel("Dirección").fill("Av. Ejemplo 1234");
    await page.getByRole("tab", { name: "Imágenes" }).click();
    const mobile = imageSection(page, "Portada del evento (móvil)");
    const poster = imageSection(page, "Afiche del evento");
    const desktop = imageSection(page, "Portada del evento");
    await expect(page.getByRole("button", { name: "Usar el afiche como portada móvil" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Usar la portada móvil como afiche" })).toBeDisabled();
    await upload(page, mobile, "Móvil verde", "#00aa44", 1080, 1350);
    const mobileId = await mobile.locator('input[name="heroMobileMediaId"]').inputValue();
    await page.getByRole("button", { name: "Usar la portada móvil como afiche" }).click();
    await expect(poster.locator('input[name="posterMediaId"]')).toHaveValue(mobileId);
    expect((await page.getByRole("button", { name: "Usar el afiche como portada móvil" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.getByRole("tab", { name: "Publicación" }).click();
    await page.getByRole("radio", { name: "Publicado" }).check();
    await page.getByRole("button", { name: "Crear evento" }).click();
    await expect(page).toHaveURL(/\/eventos\/[0-9a-f-]+\?creado=1$/);
    const editUrl = page.url();
    const slug = await page.getByLabel("Enlace del evento").inputValue();
    await page.getByRole("tab", { name: "Imágenes" }).click();
    await expect(mobile.locator('input[name="heroMobileMediaId"]')).toHaveValue(mobileId);
    await expect(poster.locator('input[name="posterMediaId"]')).toHaveValue(mobileId);

    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(`/eventos/${slug}`);
    const hero = page.locator("#event-hero");
    const picture = hero.locator('[data-slot="event-hero-picture"]');
    await expect.poll(() => picture.locator("img").evaluate((image: HTMLImageElement) => image.currentSrc)).toContain(`/variants/${mobileId}/`);
    await expect.poll(() => picture.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(hero.locator('[data-slot="hero-watermark"]')).toBeHidden();
    await page.screenshot({ path: `test-results/event-mobile-only-${width}.png` });
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(hero.locator('[data-slot="hero-watermark"]')).toBeVisible();
    await expect(picture).toBeHidden();
    await expect.poll(() => picture.locator("img").evaluate((image: HTMLImageElement) => image.currentSrc)).toContain("data:image/svg+xml");

    await page.setViewportSize({ width, height: 900 });
    await page.goto(editUrl);
    await page.getByRole("tab", { name: "Imágenes" }).click();
    await poster.getByRole("button", { name: "Quitar", exact: true }).click();
    await upload(page, poster, "Afiche azul", "#2255dd", 1080, 1350);
    const posterId = await poster.locator('input[name="posterMediaId"]').inputValue();
    await page.getByRole("button", { name: "Usar el afiche como portada móvil" }).click();
    await expect(mobile.locator('input[name="heroMobileMediaId"]')).toHaveValue(posterId);
    await upload(page, desktop, "Portada naranja", "#dd6611", 1920, 1080);
    const desktopId = await desktop.locator('input[name="heroMediaId"]').inputValue();
    await page.screenshot({ path: `test-results/event-image-reuse-admin-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados", { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Imágenes" }).click();
    await expect(mobile.locator('input[name="heroMobileMediaId"]')).toHaveValue(posterId);
    await expect(poster.locator('input[name="posterMediaId"]')).toHaveValue(posterId);

    for (const publicWidth of [375, 767, 768, 1440]) {
      await page.setViewportSize({ width: publicWidth, height: 900 });
      await page.goto(`/eventos/${slug}`);
      await expect.poll(() => picture.locator("img").evaluate((image: HTMLImageElement) => image.currentSrc)).toContain(`/variants/${publicWidth < 768 ? posterId : desktopId}/`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto("/eventos");
    await expect(page.locator(`[data-event="${slug}"] img`)).toHaveAttribute("src", new RegExp(`/variants/${posterId}/`));
  });
}
