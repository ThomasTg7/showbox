import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { BRAND } from "../src/domain/brand";
import { signInAsAdmin } from "./fixtures/admin";

for (const width of [375, 1440]) {
  test(`ShowBox mantiene identidad, enlaces y controles accesibles a ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".sb-header")).toHaveAttribute("inert", "");
    await expect(page.locator(".sb-header [role=img]")).toHaveAttribute("aria-label", BRAND.name);
    await expect(page.locator('[data-slot="intro-loader"]')).toHaveCount(0);
    await expect(page.locator(".sb-page-enter")).toHaveCSS("animation-name", "none");
    const tickets = page.getByRole("link", { name: "Comprar entradas" }).first();
    await expect(tickets).toHaveCSS("background-color", "rgb(227, 16, 31)");
    await expect(tickets).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.screenshot({ path: `test-results/showbox-public-${width}.png`, fullPage: true });

    await signInAsAdmin(page);
    await expect(page.locator(".sb-admin-toolbar")).toContainText(BRAND.name);
    await expect(page.getByRole("link", { name: "Ver sitio" })).toHaveAttribute("href", `${process.env.SITE_URL}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
    await page.screenshot({ path: `test-results/sb-admin-${width}.png`, fullPage: true });
    if (width === 375) {
      await page.getByRole("button", { name: "Mostrar u ocultar menú" }).click();
      const menu = page.getByRole("dialog");
      await expect(menu.getByRole("img", { name: BRAND.name })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Inicio", exact: true })).toHaveCSS("background-color", "rgb(42, 18, 18)");
      await menu.getByRole("link", { name: "Boxeadores", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Boxeadores", level: 1 })).toBeVisible();
      await expect(menu).toHaveCount(0);
    }
  });
}

test("la presentación ShowBox no intercepta clics y se muestra una vez por sesión", async ({ page }) => {
  await page.goto("/");
  const intro = page.locator('[data-slot="intro-loader"]');
  await expect(intro).toBeVisible();
  await expect(intro).toHaveCSS("pointer-events", "none");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(intro).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("sb-intro-seen"))).toBe("1");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(intro).toHaveCount(0);
});

test("el botón de entradas del listado conserva contraste al pasar el cursor", async ({ page }) => {
  await page.goto("/eventos");
  const button = page.locator('[data-event="showbox-fight-night-5"]').getByRole("link", { name: "Comprar entradas", exact: true });
  await button.hover();
  await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(button).toHaveCSS("background-color", "rgb(227, 16, 31)");
});

test("las transiciones permiten navegar y volver al inicio sin errores", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator("#boxeadores").scrollIntoViewIfNeeded();
  await page.locator("#cartelera").scrollIntoViewIfNeeded();
  await expect(page.locator(".sb-header")).not.toHaveAttribute("inert", "");
  await page.getByRole("banner").getByRole("link", { name: "Noticias", exact: true }).click();
  await expect(page).toHaveURL(/\/noticias$/);
  await page.getByRole("banner").getByRole("link", { name: `${BRAND.name} inicio`, exact: true }).click();
  await expect(page.locator("#event-hero")).toBeVisible();
  await page.locator("#boxeadores").scrollIntoViewIfNeeded();
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  expect(errors).toEqual([]);
});
