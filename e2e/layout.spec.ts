import { expect, test } from "@playwright/test";

const MOBILE_VIEWPORTS = [
  { width: 320, height: 700 },
  { width: 375, height: 812 },
];

for (const viewport of MOBILE_VIEWPORTS) {
  test(`no hay overflow horizontal en ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

    expect(fitsViewport).toBe(true);
  });
}

test("el botón Menú abre el menú móvil y muestra Boxeadores", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.locator("#cartelera").scrollIntoViewIfNeeded();
  await expect(page.locator(".sb-header")).not.toHaveAttribute("inert", "");

  await page.getByRole("button", { name: "Menú" }).click();

  const mobileMenu = page.getByRole("navigation", { name: "Menú móvil" });
  await expect(mobileMenu.getByRole("link", { name: "Boxeadores" })).toBeVisible();
});

test("con teclado: el menú recibe el foco, Escape lo cierra y el foco vuelve al botón", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.locator("#cartelera").scrollIntoViewIfNeeded();
  await expect(page.locator(".sb-header")).not.toHaveAttribute("inert", "");

  const menuButton = page.getByRole("button", { name: "Menú" });
  await menuButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: "Cerrar menú" })).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("navigation", { name: "Menú móvil" })).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("con el menú abierto, Tab no sale del menú", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.locator("#cartelera").scrollIntoViewIfNeeded();
  await expect(page.locator(".sb-header")).not.toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Menú" }).click();

  const mobileMenu = page.getByRole("navigation", { name: "Menú móvil" });
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    await expect(mobileMenu.locator(":focus")).toHaveCount(1);
  }
});

test("el nav muestra los 5 links en escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator("#cartelera").scrollIntoViewIfNeeded();
  await expect(page.locator(".sb-header")).not.toHaveAttribute("inert", "");

  const nav = page.getByRole("navigation", { name: "Principal" });

  await expect(nav.getByRole("link")).toHaveCount(5);
});

test("en /boxeadores el menú marca Boxeadores con degradado ShowBox, y al cerrarse se anima antes de desaparecer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/boxeadores/bryan-cevallos");
  await page.getByRole("button", { name: "Menú" }).click();

  const mobileMenu = page.getByRole("navigation", { name: "Menú móvil" });
  const current = mobileMenu.getByRole("link", { name: "Boxeadores" });
  await expect(current).toHaveAttribute("aria-current", "page");
  await expect(current).toHaveCSS("background-image", /linear-gradient/);
  await expect(mobileMenu.getByRole("link", { name: "Eventos" })).not.toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Cerrar menú" }).click();
  await expect(page.locator("#mobile-menu")).toHaveAttribute("data-state", "closing");
  await expect(mobileMenu).toBeHidden();
  await expect(page.locator("#mobile-menu")).toHaveAttribute("data-state", "closed");
});

test("en escritorio el enlace de la sección actual va con degradado ShowBox", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rankings");
  const current = page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Rankings" });
  await expect(current).toHaveAttribute("aria-current", "page");
  await expect(current).toHaveCSS("background-image", /linear-gradient/);
});
