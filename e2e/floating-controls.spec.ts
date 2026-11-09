import { expect, test, type Page } from "@playwright/test";

/** A finished touch (tap). A touch that becomes a scroll ends in pointercancel and wakes nothing. */
async function tap(page: Page) {
  const main = page.locator("main");
  await main.dispatchEvent("pointerdown", { pointerType: "touch" });
  await main.dispatchEvent("pointerup", { pointerType: "touch" });
}

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
      await tap(page);
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
    await tap(page);
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
    await tap(page);
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
    await tap(page);
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

test("al navegar con teclado a una portada, el navbar se oculta hasta volver a usar Tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/eventos");
  const header = page.locator(".sb-header");
  await page.clock.runFor(4_500);
  await expect(header).toHaveAttribute("data-hidden", "true");
  await page.keyboard.press("Tab");
  await expect(header).toHaveAttribute("data-hidden", "false");
  await page.evaluate(() => Reflect.set(window, "__showboxTestDocument", true));
  await header.locator('a[href="/"]').press("Enter");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#event-hero")).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "__showboxTestDocument"))).toBe(true);
  await expect(header).toHaveAttribute("data-hidden", "true", { timeout: 1_000 });
  await page.keyboard.press("Tab");
  await expect(header).toHaveAttribute("data-hidden", "false");
});

test("el navbar oculto sobre una portada no recibe foco antes de hidratar", async ({ browser }) => {
  const page = await browser.newPage({ javaScriptEnabled: false });
  try {
    await page.goto("/");
    await expect(page.locator("#event-hero")).toBeVisible();
    await page.keyboard.press("Tab");
    expect(await page.locator(".sb-header :focus").count()).toBe(0);
  } finally {
    await page.close();
  }
});

test("la portada llega oculta desde el servidor y el navbar no asoma mientras se hidrata", async ({ page, request }) => {
  for (const path of ["/", "/eventos/showbox-fight-night-5"]) {
    const html = await (await request.get(path)).text();
    expect(html).toContain("data-cover-marker");
  }
  const listing = await (await request.get("/eventos")).text();
  expect(listing).not.toContain("data-cover-marker");
  await page.addInitScript(() => {
    const seen: number[] = [];
    (window as unknown as { __opacity: number[] }).__opacity = seen;
    const sample = () => {
      const header = document.querySelector(".sb-header");
      if (header) seen.push(Number(getComputedStyle(header).opacity));
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (const path of ["/", "/eventos/showbox-fight-night-5"]) {
    await page.goto(path);
    await expect(page.locator(".sb-header")).toHaveAttribute("data-hidden", "true");
    await page.waitForTimeout(1_000);
    const opacities = await page.evaluate(() => (window as unknown as { __opacity: number[] }).__opacity);
    expect(opacities.length).toBeGreaterThan(5);
    expect(Math.max(...opacities)).toBe(0);
  }
});

test.describe("touch scrolling on a phone, with real motion", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("la portada se ve limpia y, tras el reposo, un gesto de scroll hacia abajo no hace parpadear las barras", async ({ page }) => {
    await page.goto("/eventos/showbox-fight-night-5");
    await expect(page.locator("#event-hero")).toBeVisible();
    const header = page.locator(".sb-header");
    const tickets = page.locator('[data-slot="event-sticky-bar"]');
    await expect(header).toHaveAttribute("data-hidden", "true");
    await expect(tickets).toHaveAttribute("data-visible", "false");
    const cdp = await page.context().newCDPSession(page);
    async function swipe(distance: number) {
      let y = distance < 0 ? 600 : 200;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 187, y }] });
      for (let step = 0; step < 12; step++) {
        y += distance / 12;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 187, y }] });
        await page.waitForTimeout(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(500);
    }
    await swipe(-500); // dentro de la portada: nada aparece
    await expect(header).toHaveAttribute("data-hidden", "true");
    await expect(tickets).toHaveAttribute("data-visible", "false");
    await swipe(-500);
    await swipe(-500);
    await expect(tickets).toHaveAttribute("data-visible", "true"); // pasada la portada
    await swipe(300); // hacia arriba: vuelve el navbar
    await expect(header).toHaveAttribute("data-hidden", "false");
    await expect(tickets).toHaveAttribute("data-visible", "true");
    await expect(header).toHaveAttribute("data-hidden", "true", { timeout: 6_000 }); // reposo
    await expect(tickets).toHaveAttribute("data-visible", "false");
    await page.evaluate(() => {
      const changes: string[] = [];
      const watch = (element: Element, name: string, attribute: string) => new MutationObserver(() => changes.push(`${name}=${element.getAttribute(attribute)}`))
        .observe(element, { attributes: true, attributeFilter: [attribute] });
      watch(document.querySelector(".sb-header")!, "header", "data-hidden");
      (window as unknown as { __changes: string[] }).__changes = changes;
    });
    await swipe(-300); // toque + scroll hacia abajo tras el reposo: el navbar no debe entrar y salir
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __changes: string[] }).__changes)).toEqual([]);
    await expect(header).toHaveAttribute("data-hidden", "true");
  });
});
