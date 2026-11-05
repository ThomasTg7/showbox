import { expect, test } from "@playwright/test";

for (const width of [320, 375, 430, 1440]) {
  test(`entradas y transmisión comparten fila a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/eventos/showbox-fight-night-5", "/"]) {
      await page.goto(path);
      const hero = page.locator("#event-hero");
      const tickets = hero.getByRole("link", { name: "Comprar entradas", exact: true });
      const watch = hero.getByRole("button", { name: "Dónde ver", exact: true });
      await expect(tickets).toBeVisible();
      await expect(watch).toBeVisible();
      const ticketBox = (await tickets.boundingBox())!;
      const watchBox = (await watch.boundingBox())!;
      expect(Math.abs(ticketBox.y - watchBox.y)).toBeLessThan(1);
      if (width < 640) {
        expect(ticketBox.x + ticketBox.width).toBeLessThanOrEqual(watchBox.x);
        const cardBox = (await hero.getByRole("link", { name: /Ver cartelera/ }).boundingBox())!;
        expect(cardBox.y).toBeGreaterThanOrEqual(ticketBox.y + ticketBox.height);
      }
      expect(ticketBox.height).toBeGreaterThanOrEqual(44);
      expect(watchBox.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
  });
}
