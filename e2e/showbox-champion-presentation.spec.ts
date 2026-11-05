import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`etiquetas de campeón y Dónde ver a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/eventos/showbox-fight-night-5");
    const hero = page.locator("#event-hero");
    const watch = hero.getByRole("button", { name: "Dónde ver" });
    await expect(watch).toHaveCSS("background-color", "rgb(197, 27, 58)");
    await expect(watch).toHaveCSS("color", "rgb(255, 255, 255)");
    const corner = page.getByRole("tabpanel").locator('[data-corner="red"]').first();
    const badge = corner.locator('[data-slot="bout-rank"]');
    await expect(badge).toHaveText("Campeón");
    await expect(badge).toHaveCSS("color", "rgb(255, 255, 255)");
    const rank = (await badge.boundingBox())!;
    const photo = (await corner.locator('[data-slot="bout-face"]').boundingBox())!;
    expect(Math.abs(rank.x - photo.x)).toBeLessThan(1);
    expect(Math.abs(rank.width - photo.width)).toBeLessThan(1);
    expect(Math.abs(rank.y + rank.height - photo.y)).toBeLessThan(1);
    expect(rank.height).toBe(width === 375 ? 24 : 28);

    for (const path of ["/boxeadores", "/"]) {
      await page.goto(path);
      const card = page.locator("article").filter({ has: page.locator('[data-slot="fighter-card-badge"]', { hasText: "Campeón" }) }).first();
      const label = card.locator('[data-slot="fighter-card-badge"]');
      await expect(label).toBeVisible();
      const labelBox = (await label.boundingBox())!;
      const picture = (await card.locator('[data-slot="fighter-card-photo"]').boundingBox())!;
      expect(labelBox.x - picture.x).toBe(12);
      expect(picture.y + picture.height - labelBox.y - labelBox.height).toBe(48);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
  });
}
