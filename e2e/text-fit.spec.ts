import { expect, test } from "@playwright/test";

const pages = [
  { path: "/rankings", selector: 'article[aria-label^="Ranking"] h2, article[aria-label^="Ranking"] p a, article[aria-label^="Ranking"] ol a' },
  { path: "/eventos/showbox-fight-night-5", selector: '[data-slot="bout-summary"] h3, #event-title' },
  { path: "/boxeadores", selector: "article h2" },
  { path: "/boxeadores/jordan-quinonez", selector: "#fighter-name" },
  { path: "/", selector: '#rankings article h2, #rankings article p a, #cartelera [data-slot="bout-summary"] h3, #boxeadores article h3' },
];

function wordCuts(elements: Element[]) {
  return elements.flatMap(element => {
    if (!(element instanceof HTMLElement) || !element.offsetWidth) return [];
    const bounds = element.getBoundingClientRect();
    const failures: string[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      for (const match of node.textContent!.matchAll(/\S+/gu)) {
        const range = document.createRange();
        range.setStart(node, match.index!);
        range.setEnd(node, match.index! + match[0].length);
        const rects = [...range.getClientRects()].filter(rect => rect.width > 0);
        if (rects.length > 1 || rects.some(rect => rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) failures.push(`${element.tagName}#${element.id}: ${match[0]} (${Math.round(bounds.width)}px; ${rects.map(rect => `${Math.round(rect.width)}@${Math.round(rect.left - bounds.left)}`).join(", ")}; ${element.querySelector('[data-fit-text]')?.getAttribute('style') ?? "preferred"})`);
      }
    }
    return failures;
  });
}

test("ajuste recalculado al redimensionar el ranking sin recargar", async ({ page }) => {
  await page.goto("/rankings");
  await page.evaluate(() => document.fonts.ready);
  const text = page.getByRole("heading", { name: "Peso Superligero", exact: true }).locator("[data-fit-text]");
  await expect(text).toHaveAttribute("data-fit-ready", "true");
  const sizes: string[] = [];
  for (const width of [1440, 320, 1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => text.evaluateAll(wordCuts)).toEqual([]);
    sizes.push(await text.evaluate(element => getComputedStyle(element).fontSize));
  }
  expect(new Set(sizes).size).toBeGreaterThan(1);
});

test("ajuste conserva nombres compuestos y permite nombres extremos completos", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/boxeadores");
  const text = page.locator("article h2 [data-fit-text]").first();
  await expect(text).toHaveAttribute("data-fit-ready", "true");
  for (const name of ["MAXIMILIANO ALEJANDRO FERNÁNDEZ DE LA CRUZ", "W".repeat(70)]) {
    await text.evaluate((element, value) => { element.textContent = value; window.dispatchEvent(new Event("resize")); }, name);
    await expect(text).toHaveText(name);
    await expect.poll(() => text.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const card = element.closest("article")!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()].every(rect => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.bottom <= card.bottom + 1);
    })).toBe(true);
    expect(await text.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
  }
});

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
  test(`nombres y divisiones completos sin cortes a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const { path, selector } of pages) {
      await page.goto(path);
      const labels = page.locator(selector);
      expect(await labels.count()).toBeGreaterThan(0);
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => labels.evaluateAll(elements => elements.every(element => [...element.querySelectorAll<HTMLElement>('[data-fit-text]')].every(text => !text.clientWidth || text.dataset.fitReady === "true"))), { timeout: 15_000 }).toBe(true);
      await expect.poll(() => labels.evaluateAll(wordCuts), { message: `${path}: palabras completas dentro de su columna`, timeout: 15_000 }).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
  });
}
