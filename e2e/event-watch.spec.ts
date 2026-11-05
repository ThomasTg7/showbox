import { expect, test } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

for (const width of [375, 1440]) {
  test(`configura plataformas por evento y abre el modal con sus enlaces e imagen a ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await signInAsAdmin(page);
    await page.goto(adminUrl("/eventos/nuevo"));
    const name = `Dónde ver E2E ${width}`;
    await page.getByLabel("Nombre del evento").fill(name);
    await page.getByRole("tab", { name: "Horarios y lugar" }).click();
    await page.getByLabel("Fecha del evento").fill("2031-04-10");
    await page.getByLabel("Recinto").fill("Arena Santiago");
    await page.getByLabel("Ciudad").fill("Santiago");
    await page.getByLabel("Dirección").fill("Av. Ejemplo 1234");
    await page.getByRole("tab", { name: "Dónde ver" }).click();
    await page.getByRole("button", { name: "Agregar plataforma" }).click();
    await page.getByLabel("Nombre de la plataforma 1", { exact: true }).fill("YouTube ShowBox");
    await page.getByLabel("Enlace para ver 1", { exact: true }).fill("https://youtube.com/live/showbox-e2e");
    const platform = page.getByRole("group", { name: "Plataforma 1", exact: true });
    await platform.locator('input[type="file"]').setInputFiles({ name: "plataforma.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="red"/><text x="15" y="65" fill="white" font-size="40">ShowBox</text></svg>') });
    await expect(platform.locator("img")).toBeVisible();
    await page.getByRole("button", { name: "Agregar plataforma" }).click();
    await page.getByLabel("Nombre de la plataforma 2", { exact: true }).fill("Twitch ShowBox");
    await page.getByLabel("Enlace para ver 2", { exact: true }).fill("https://twitch.tv/showbox-e2e");
    await page.getByRole("button", { name: "Subir plataforma 2" }).click();
    await expect(page.getByLabel("Nombre de la plataforma 1", { exact: true })).toHaveValue("Twitch ShowBox");
    await page.getByRole("tab", { name: "Publicación" }).click();
    await page.getByRole("radio", { name: "Publicado" }).check();
    await page.getByRole("button", { name: "Crear evento" }).click();
    await expect(page).toHaveURL(/\/eventos\/[0-9a-f-]+\?creado=1$/);
    const editUrl = page.url();
    const slug = await page.getByLabel("Enlace del evento").inputValue();
    await page.getByRole("tab", { name: "Dónde ver" }).click();
    await expect(page.getByLabel("Nombre de la plataforma 1", { exact: true })).toHaveValue("Twitch ShowBox");
    await expect(page.getByRole("group", { name: "Plataforma 2", exact: true }).locator("img")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.screenshot({ path: `test-results/event-watch-admin-${width}.png`, fullPage: true });

    await page.goto("/eventos");
    const card = page.locator(`[data-event="${slug}"]`);
    await card.getByRole("button", { name: "Ver", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(name);
    await expect(dialog.getByRole("link", { name: "Ir a ver en Twitch ShowBox" })).toHaveAttribute("href", "https://twitch.tv/showbox-e2e");
    await expect(dialog.getByRole("link", { name: "Ir a ver en YouTube ShowBox" })).toHaveAttribute("href", "https://youtube.com/live/showbox-e2e");
    await expect(dialog.locator("img")).toBeVisible();
    await expect.poll(() => dialog.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.screenshot({ path: `test-results/event-watch-modal-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(card.getByRole("button", { name: "Ver", exact: true })).toBeFocused();
    if (width === 1440) {
      const before = await page.evaluate(() => scrollY);
      await page.mouse.move(700, 600);
      await page.mouse.wheel(0, -600);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before - 100);
    }

    await page.goto(`/eventos/${slug}`);
    await page.getByRole("button", { name: "Dónde ver" }).click();
    await expect(dialog.getByRole("link", { name: /Ir a ver/ })).toHaveCount(2);
    await page.keyboard.press("Escape");
    await page.goto("/eventos/showbox-fight-night-5");
    await page.getByRole("button", { name: "Dónde ver" }).click();
    await expect(dialog).not.toContainText("Twitch ShowBox");
    await page.keyboard.press("Escape");

    await page.goto(editUrl);
    await page.getByRole("tab", { name: "Dónde ver" }).click();
    await page.getByRole("button", { name: "Quitar plataforma 2" }).click();
    await page.getByRole("button", { name: "Quitar plataforma 1" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados", { exact: true })).toBeVisible();
    await page.goto(`/eventos/${slug}`);
    await page.getByRole("button", { name: "Dónde ver" }).click();
    await expect(dialog).toContainText("Pronto anunciaremos dónde ver este evento.");
    await expect(dialog.getByRole("link", { name: /Ir a ver/ })).toHaveCount(0);
  });
}

test("el botón Ver de la cartelera resumida abre las opciones del evento", async ({ page }) => {
  await page.goto("/");
  await page.locator("#cartelera").getByRole("button", { name: "Ver", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("ShowBox Fight Night 5");
});
