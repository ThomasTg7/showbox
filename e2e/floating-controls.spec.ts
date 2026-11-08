import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`navbar oculto mientras se ve la portada de inicio o evento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/", "/eventos/showbox-fight-night-5"]) {
      await page.goto(path);
      await expect(page.locator("#event-hero")).toBeVisible();
      const header = page.locator(".sb-header");
      await expect(header).toHaveAttribute("data-hidden", "true");
      await expect(page.locator('[data-slot="event-sticky-bar"]')).toHaveAttribute("data-visible", "false");
      await page.locator("main").dispatchEvent("pointermove", { pointerType: "mouse" });
      await page.locator("main").dispatchEvent("pointerdown", { pointerType: "touch" });
      await page.evaluate(async () => {
        window.scrollTo(0, 400);
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        window.scrollBy(0, -48);
      });
      await expect(header).toHaveAttribute("data-hidden", "true");
      await expect(page.locator('[data-slot="event-sticky-bar"]')).toHaveAttribute("data-visible", "false");
      await page.evaluate(async () => {
        window.scrollTo(0, document.getElementById("event-hero")!.offsetHeight + 220);
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        window.scrollBy(0, -48);
      });
      await expect(header).toHaveAttribute("data-hidden", "false");
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(header).toHaveAttribute("data-hidden", "true");
      await expect(page.locator('[data-slot="event-sticky-bar"]')).toHaveAttribute("data-visible", "false");
    }
  });

  test(`inicio anuncia el último próximo evento con entradas y se oculta tras 3 segundos a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await page.goto("/");
    const banner = page.locator('[data-slot="event-sticky-bar"]');
    await expect(banner).toHaveAttribute("data-visible", "false");
    await page.evaluate(() => window.scrollTo(0, document.getElementById("event-hero")!.offsetHeight + 220));
    await expect(banner).toHaveAttribute("data-visible", "true");
    await expect(banner).toContainText("Evento E2E Entradas Agotadas");
    await expect(banner.getByRole("link", { name: "Entradas", exact: true })).toHaveAttribute("href", "https://tickets.example.cl/agotadas");
    const box = (await banner.boundingBox())!;
    expect(Math.abs(900 - box.y - box.height)).toBeLessThan(1);
    await page.clock.runFor(3_100);
    await expect(banner).toHaveAttribute("data-visible", "false");
    await page.locator("main").dispatchEvent("pointerdown", { pointerType: "touch" });
    await expect(banner).toHaveAttribute("data-visible", "true");
    await expect(page.locator(".sb-header")).toHaveAttribute("data-hidden", "true");
  });

  test(`controles flotantes se ocultan en reposo y vuelven al interactuar a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await page.goto("/eventos/showbox-fight-night-5");
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('#event-hero [data-fit-text]').evaluateAll(elements =>
      elements.length > 0 && elements.every(element => element.getAttribute("data-fit-ready") === "true"),
    )).toBe(true);
    await expect(page.locator(".sb-header")).toHaveAttribute("data-hidden", "true");
    await expect(page.locator('[data-slot="event-sticky-bar"]')).toHaveAttribute("inert", "");
    await page.locator("#cartelera").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 220));
    const header = page.locator(".sb-header");
    const tickets = page.locator('[data-slot="event-sticky-bar"]');
    await expect(header).toHaveAttribute("data-hidden", "true");
    await expect(tickets).toHaveAttribute("data-visible", "true");
    await page.locator("main").dispatchEvent("pointermove", { pointerType: "mouse" });
    await expect(header).toHaveAttribute("data-hidden", "true");
    await page.locator("main").dispatchEvent("pointerdown", { pointerType: "touch" });
    await expect(header).toHaveAttribute("data-hidden", "true");
    if (width >= 1024) {
      await tickets.hover();
      await expect(header).toHaveAttribute("data-hidden", "true");
      await page.mouse.move(width - 10, 450);
    }
    await page.locator("main").dispatchEvent("pointermove", { pointerType: "touch" });
    await expect(header).toHaveAttribute("data-hidden", "true");
    await page.evaluate(() => window.scrollBy(0, -48));
    await expect(header).toHaveAttribute("data-hidden", "false");
    await page.evaluate(() => window.scrollBy(0, 48));
    await expect(header).toHaveAttribute("data-hidden", "true");
    const box = (await tickets.boundingBox())!;
    expect(Math.abs(900 - box.y - box.height)).toBeLessThan(1);
    await page.evaluate(() => window.scrollBy(0, -48));
    await expect(header).toHaveAttribute("data-hidden", "false");
    await page.clock.runFor(3_100);
    await expect(tickets).toHaveAttribute("data-visible", "false");
    await expect(header).toHaveAttribute("data-hidden", "false");
    await page.clock.runFor(1_400);
    await expect(header).toHaveAttribute("data-hidden", "true");
    await expect(tickets).toHaveAttribute("data-visible", "false");
    await expect(tickets).toHaveAttribute("inert", "");
    await page.locator("main").dispatchEvent("pointerdown", { pointerType: "touch" });
    await expect(header).toHaveAttribute("data-hidden", "false");
    await expect(tickets).toHaveAttribute("data-visible", "true");
    if (width < 1024) {
      await page.getByRole("button", { name: "Menú", exact: true }).click();
      await page.clock.runFor(6_000);
      await expect(page.getByRole("navigation", { name: "Menú móvil" })).toBeVisible();
      await expect(header).toHaveAttribute("data-hidden", "false");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Menú", exact: true })).toBeFocused();
    } else {
      const link = header.getByRole("link", { name: "Noticias", exact: true });
      await link.hover();
      await page.clock.runFor(6_000);
      await expect(header).toHaveAttribute("data-hidden", "false");
      await link.focus();
      await page.clock.runFor(6_000);
      await expect(link).toBeFocused();
      await expect(header).toHaveAttribute("data-hidden", "false");
    }
  });
}

test("el navbar puede recuperarse con teclado después del reposo", async ({ page }) => {
  await page.clock.install();
  await page.goto("/eventos");
  await page.clock.runFor(4_500);
  await expect(page.locator(".sb-header")).toHaveAttribute("data-hidden", "true");
  await page.keyboard.press("Tab");
  await expect(page.locator(".sb-header")).toHaveAttribute("data-hidden", "false");
});
