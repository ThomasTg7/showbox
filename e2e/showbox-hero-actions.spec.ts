import { expect, test } from "@playwright/test";

for (const width of [375, 1024, 1440]) {
  test(`acciones de la cartelera resumida en una fila solo en PC a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const actions = page.locator('#cartelera [data-slot="event-actions"]');
    await actions.scrollIntoViewIfNeeded();
    const details = actions.getByRole('link', { name: 'Ver evento', exact: true });
    const tickets = actions.getByRole('link', { name: 'Comprar entradas' });
    const watch = actions.getByRole('button', { name: 'Dónde ver', exact: true });
    const detailBox = (await details.boundingBox())!;
    const ticketBox = (await tickets.boundingBox())!;
    const watchBox = (await watch.boundingBox())!;
    expect(Math.abs(detailBox.y - ticketBox.y)).toBeLessThan(1);
    if (width >= 1024) {
      expect(Math.abs(ticketBox.y - watchBox.y)).toBeLessThan(1);
      expect(watchBox.x).toBeGreaterThanOrEqual(ticketBox.x + ticketBox.width);
      expect(Math.abs(detailBox.width - watchBox.width)).toBeLessThan(1);
    } else {
      expect(watchBox.y).toBeGreaterThanOrEqual(ticketBox.y + ticketBox.height);
      expect(watchBox.width).toBeGreaterThan(detailBox.width * 2);
    }
    expect(watchBox.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}

for (const width of [320, 375, 430, 1440]) {
  test(`acciones de portada horizontales en PC y apiladas en móvil a ${width}px`, async ({ page }) => {
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
      if (width >= 1024) {
        expect(Math.abs(watchBox.y - ticketBox.y)).toBeLessThan(1);
        expect(Math.abs(watchBox.width - ticketBox.width)).toBeLessThan(1);
        expect(watchBox.x).toBeGreaterThanOrEqual(ticketBox.x + ticketBox.width);
      } else {
        expect(watchBox.y).toBeGreaterThanOrEqual(ticketBox.y + ticketBox.height);
        expect(Math.abs(watchBox.x - detailBox.x)).toBeLessThan(1);
        expect(Math.abs(watchBox.width - (ticketBox.x + ticketBox.width - detailBox.x))).toBeLessThan(1);
      }
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
    expect(bar.y).toBe(width >= 1024 ? 12 : 8);
    expect(bar.x).toBeGreaterThanOrEqual(12);
    expect(bar.height).toBeLessThanOrEqual(64);
    if (width < 1024) expect(bar.height).toBe(48);
    expect(logo.width).toBeLessThanOrEqual(112);
    expect(Math.abs(logo.x + logo.width / 2 - width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(logo.y + logo.height / 2 - (bar.y + bar.height / 2))).toBeLessThanOrEqual(1);
    if (width >= 1024) {
      const links = await header.getByRole('navigation', { name: 'Principal' }).getByRole('link').all();
      const boxes = await Promise.all(links.map(link => link.boundingBox()));
      const leftEdge = Math.max(...boxes.filter(box => box && box.x < logo.x).map(box => box!.x + box!.width));
      const rightEdge = Math.min(...boxes.filter(box => box && box.x > logo.x).map(box => box!.x));
      expect(logo.x - leftEdge).toBeLessThanOrEqual(56);
      expect(rightEdge - logo.x - logo.width).toBeLessThanOrEqual(56);
    }
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

for (const width of [375, 1440]) {
  test(`la barra de entradas aparece al pie de la pantalla tras pasar la portada a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/eventos');
    await page.locator('[data-event="showbox-fight-night-5"]').getByRole('link', { name: 'Ver evento', exact: true }).click();
    await expect(page).toHaveURL(/\/eventos\/showbox-fight-night-5$/);
    const bar = page.locator('[data-slot="event-sticky-bar"]');
    await expect(bar).toHaveAttribute('inert', '');
    await page.locator('#cartelera').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.getElementById('cartelera')!.offsetTop + 200));
    await expect(bar).toHaveAttribute('data-visible', 'true');
    if (width >= 1024) {
      await page.addStyleTag({ content: '@layer utilities { .legacy-ticket-position { top: 88px; bottom: auto; } }' });
      await bar.evaluate(element => element.classList.add('legacy-ticket-position'));
    }
    const box = (await bar.boundingBox())!;
    expect(box.y).toBeGreaterThan(700);
    expect(900 - box.y - box.height).toBeGreaterThanOrEqual(0);
    expect(900 - box.y - box.height).toBeLessThanOrEqual(20);
    await expect(bar.getByRole('link', { name: 'Entradas' })).toHaveAttribute('href', /example\.com\/entradas/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}
