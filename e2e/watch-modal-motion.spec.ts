import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`el modal aparece progresivamente y respeta movimiento reducido a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/eventos/showbox-fight-night-5");
    const trigger = page.getByRole("button", { name: "Dónde ver" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    const opening = await dialog.evaluate((element) => {
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')!;
      return [element, overlay].map((part) => {
        const animation = part.getAnimations()[0];
        if (!animation) return { duration: 0, opacity: 1 };
        animation.pause();
        animation.currentTime = 120;
        const sample = { duration: Number(animation.effect!.getTiming().duration), opacity: Number(getComputedStyle(part).opacity) };
        animation.play();
        return sample;
      });
    });
    for (const sample of opening) {
      expect(sample.duration).toBeGreaterThanOrEqual(250);
      expect(sample.opacity).toBeGreaterThan(0);
      expect(sample.opacity).toBeLessThan(1);
    }
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await trigger.click();
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => element.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}
