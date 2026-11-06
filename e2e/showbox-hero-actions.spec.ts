import { expect, test } from "@playwright/test";

for (const width of [320, 375, 430, 1440]) {
  test(`cartelera y entradas alineadas, con Dónde ver a todo el ancho a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/eventos/showbox-fight-night-5", "/"]) {
      await page.goto(path);
      const hero = page.locator("#event-hero");
      const tickets = hero.getByRole("link", { name: "Comprar entradas", exact: true });
      const details = hero.getByRole("link", { name: "Ver cartelera", exact: true });
      const watch = hero.getByRole("button", { name: "Dónde ver", exact: true });
      await expect(tickets).toBeVisible();
      await expect(watch).toBeVisible();
      const ticketBox = (await tickets.boundingBox())!;
      const watchBox = (await watch.boundingBox())!;
      const detailBox = (await details.boundingBox())!;
      expect(Math.abs(ticketBox.y - detailBox.y)).toBeLessThan(1);
      expect(Math.abs(ticketBox.width - detailBox.width)).toBeLessThan(1);
      expect(watchBox.y).toBeGreaterThanOrEqual(ticketBox.y + ticketBox.height);
      expect(Math.abs(watchBox.x - detailBox.x)).toBeLessThan(1);
      expect(Math.abs(watchBox.width - (ticketBox.x + ticketBox.width - detailBox.x))).toBeLessThan(1);
      expect(ticketBox.height).toBeGreaterThanOrEqual(44);
      expect(watchBox.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
  });
}

for (const width of [375, 1440]) {
  test(`navbar flotante con logo pequeño centrado y acciones uniformes a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/eventos');
    const header = page.locator('.sb-header');
    await expect(header).toBeVisible();
    const bar = (await header.boundingBox())!;
    const logo = (await header.getByRole('link', { name: 'ShowBox Promotions inicio' }).boundingBox())!;
    expect(bar.y).toBeGreaterThanOrEqual(12);
    expect(bar.x).toBeGreaterThanOrEqual(12);
    expect(bar.height).toBeLessThanOrEqual(64);
    expect(logo.width).toBeLessThanOrEqual(112);
    expect(Math.abs(logo.x + logo.width / 2 - width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(logo.y + logo.height / 2 - (bar.y + bar.height / 2))).toBeLessThanOrEqual(1);
    const card = page.locator('[data-event="showbox-fight-night-5"]');
    const details = card.getByRole('link', { name: 'Ver evento', exact: true });
    const tickets = card.getByRole('link', { name: 'Comprar entradas' });
    const watch = card.getByRole('button', { name: 'Dónde ver' });
    const detailBox = (await details.boundingBox())!;
    const ticketBox = (await tickets.boundingBox())!;
    const watchBox = (await watch.boundingBox())!;
    expect(Math.abs(detailBox.width - ticketBox.width)).toBeLessThan(1);
    expect(watchBox.width).toBeGreaterThan(detailBox.width * 2);
    await watch.click();
    const channel = page.getByRole('dialog').getByRole('link', { name: 'Ir a ver en YouTube · ShowBox Promotions' });
    await expect(channel).toHaveAttribute('href', 'https://www.youtube.com/@ShowBoxPromotionsEC');
    await expect(page.getByTestId('youtube-platform-icon')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}
