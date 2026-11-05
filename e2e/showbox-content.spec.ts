import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`contenido público de ShowBox a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/", "/eventos", "/eventos/showbox-fight-night-5", "/noticias", "/noticias/cartelera-completa-de-showbox-fight-night-5-confirmada", "/boxeadores/jordan-quinonez", "/entradas"]) {
      await page.goto(path);
      await expect(page.locator("body")).not.toContainText(/guerra\s+campal/i);
      await expect(page.locator('a[href*="guerra-campal"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
  });
}

