import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`portada centrada y navegación reversible a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/eventos/showbox-fight-night-5");
    const hero = page.locator("#event-hero");
    await expect(hero.getByRole("button", { name: "Dónde ver" })).toBeVisible();
    await expect(page.locator(".sb-header")).toHaveAttribute("inert", "");
    if (width === 1440) {
      const hiddenBar = (await page.locator('[data-slot="event-sticky-bar"]').boundingBox())!;
      expect(hiddenBar.y + hiddenBar.height).toBeLessThanOrEqual(0);
    }
    const title = (await hero.locator("h1").boundingBox())!;
    expect(Math.abs(title.x + title.width / 2 - width / 2)).toBeLessThan(2);
    await hero.getByRole("link", { name: /Ver cartelera/ }).click();
    await expect(page.locator(".sb-header")).not.toHaveAttribute("inert", "");
    const active = page.getByRole("tab", { name: "Cartelera estelar" });
    await expect(active).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(active).toHaveCSS("color", "rgb(197, 27, 58)");
    if (width === 1440) {
      await page.evaluate(() => window.scrollTo(0, document.getElementById("cartelera")!.offsetTop + 200));
      const bar = page.locator('[data-slot="event-sticky-bar"]');
      await expect(bar).toHaveAttribute("data-visible", "true");
      expect((await bar.boundingBox())!.y).toBeGreaterThanOrEqual(76);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(".sb-header")).toHaveAttribute("inert", "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.screenshot({ path: `test-results/showbox-event-hero-${width}.png` });
  });
}

test("el enlace de la pelea y el detalle usan degradado vertical ShowBox", async ({ page }) => {
  await page.goto("/eventos/showbox-fight-night-1");
  const bout = page.getByRole("tabpanel").locator("[data-bout]").first();
  await bout.getByRole("button", { name: /Ver datos/ }).click();
  const link = bout.getByRole("link", { name: /Ver la pelea y las tarjetas/ });
  await expect(link).toHaveCSS("background-image", "linear-gradient(rgb(229, 34, 68), rgb(100, 51, 116))");
  await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
  await link.click();
  await expect(page.locator("h1 .sb-gradient-text")).toHaveCSS("background-image", "linear-gradient(rgb(229, 34, 68), rgb(100, 51, 116))");
  await expect(page.locator(".sb-header")).not.toHaveAttribute("inert", "");
});
