import { expect, test, type Page } from "@playwright/test";
import { db } from "@/db";
import { media } from "@/db/schema/media";
import { createFighter, setFighterPublication } from "@/features/fighters/service";
import { divisionIdBySlug, validFighterInput } from "@/features/fighters/test-helpers";
import { recordBoutResult } from "@/features/results/service";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";
import { createE2eCard } from "./fixtures/events";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

// Seed: Jordan Quiñónez tiene tres peleas en ShowBox (ShowBox Fight Night 4 KO, ShowBox Fight Night 2 derrota dividida, ShowBox Fight Night 1 decisión) = 2-1-0;
// Bryan Cevallos solo tiene la pelea programada de ShowBox Fight Night 5; Patricio Ortiz (retirado) dos derrotas y nada programado.

test("Jordan Quiñónez: historial en orden, récord en ShowBox, cifras del hero y próxima pelea", async ({ page }) => {
  await page.goto("/boxeadores/jordan-quinonez");
  await expect(page.getByRole("heading", { name: "Jordan Quiñónez", level: 1 })).toBeVisible();

  const rows = page.locator("[data-fight]");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("ShowBox Fight Night 4");
  await expect(rows.nth(1)).toContainText("ShowBox Fight Night 2");
  await expect(rows.nth(2)).toContainText("ShowBox Fight Night 1");
  await expect(rows.nth(0)).toHaveAttribute("data-result", "win");
  await expect(rows.nth(1)).toHaveAttribute("data-result", "loss");
  await expect(rows.nth(0)).toContainText("Kevin Andrango");
  await expect(rows.nth(0)).toContainText("KO");
  await expect(rows.nth(0)).toContainText("R2 2:03");
  await expect(rows.nth(1)).toContainText("Decisión dividida");
  await expect(rows.nth(2)).toContainText("Decisión unánime");
  await expect(rows.nth(0).getByRole("link", { name: "Kevin Andrango" })).toHaveAttribute("href", "/boxeadores/kevin-andrango");
  await expect(rows.nth(0).getByRole("link", { name: "ShowBox Fight Night 4" })).toHaveAttribute("href", "/eventos/showbox-fight-night-4");

  const gc = page.locator('[data-level="pro"] [data-record="gc"]');
  await expect(gc).toContainText("2-1-0");
  await expect(gc).toContainText("Racha");
  await expect(gc.locator("[data-average-time]")).toHaveText("12:21");

  // Con peleas en la promotora el hero muestra KO/TKO, Decisión y Victorias de ese récord.
  const hero = page.locator("section").first();
  await expect(hero.getByRole("term").filter({ hasText: "KO/TKO" })).toBeVisible();
  await expect(hero.getByRole("term").filter({ hasText: "Decisión" })).toBeVisible();
  await expect(hero.getByRole("term").filter({ hasText: "Victorias" })).toBeVisible();
  await expect(hero.getByRole("term").filter({ hasText: "Derrotas" })).toHaveCount(0);

  // Próxima pelea bajo el hero.
  const next = page.locator('[data-slot="fighter-next-bout"]');
  await expect(next).toContainText("Próxima pelea");
  await expect(next).toContainText("Bryan Cevallos");
  await expect(next).toContainText("★ Por el título");
  await expect(next.getByRole("link", { name: "ShowBox Fight Night 5" })).toHaveAttribute("href", "/eventos/showbox-fight-night-5");

  await expectNoHorizontalScroll(page);
});

test("un boxeador sin peleas en la promotora conserva las cifras del récord total y no tiene historial", async ({ page }) => {
  await page.goto("/boxeadores/bryan-cevallos");
  await expect(page.getByRole("heading", { name: "Historial de peleas" })).toHaveCount(0);
  await expect(page.locator("[data-fight]")).toHaveCount(0);
  await expect(page.locator('[data-record="gc"]')).toHaveCount(0);
  // Cifras del hero: Victorias, Derrotas y Empates del récord manual (nunca 0-0-0).
  const hero = page.locator("section").first();
  await expect(hero.getByRole("term").filter({ hasText: "Victorias" })).toBeVisible();
  await expect(hero.getByRole("term").filter({ hasText: "Derrotas" })).toBeVisible();
  await expect(hero.getByRole("term").filter({ hasText: "Empates" })).toBeVisible();
  await expect(page.locator('[data-slot="fighter-next-bout"]')).toContainText("Próxima pelea");
});

test("sin pelea programada, bajo el hero se muestra la última pelea", async ({ page }) => {
  await page.goto("/boxeadores/patricio-ortiz");
  const last = page.locator('[data-slot="fighter-next-bout"]');
  await expect(last).toContainText("Última pelea");
  await expect(last).toContainText("Jefferson Chalá");
  await expect(last).toContainText("Derrota");
  await expect(last).toContainText("Descalificación (Golpe bajo reiterado)");
  await expect(page.locator("[data-fight]")).toHaveCount(2);
});

test("el historial cambia al enviar el evento a la papelera, y se puede filtrar por nivel", async ({ page }) => {
  test.setTimeout(120_000);
  // Ruth Huamán (publicada, sin uso en otros specs) tiene ShowBox Fight Night 1 (pro, derrota) y ShowBox Fight Night 2 (amateur, empate).
  const card = await createE2eCard("Evento E2E Historial", { "Cartelera estelar": [["ruth-huaman", "uno"]] });
  const result = await recordBoutResult(db, card.boutIds[0]!, { outcome: "red_win", method: "decision", decisionType: "unanimous" }, "e2e");
  expect(result.ok).toBe(true);

  await page.goto("/boxeadores/ruth-huaman");
  const rows = page.locator("[data-fight]");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Evento E2E Historial");
  await expect(rows.first()).toHaveAttribute("data-result", "win");

  // El filtro solo aparece si hay peleas de los dos niveles.
  const filter = page.getByRole("group", { name: "Filtrar por nivel" });
  await filter.getByRole("button", { name: "Amateur" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute("data-level", "amateur");
  await filter.getByRole("button", { name: "Todas" }).click();
  await expect(rows).toHaveCount(3);

  // Enviar el evento a la papelera desde el panel: su pelea sale del historial (la caché se invalida en la action).
  await signInAsAdmin(page);
  await page.goto(adminUrl("/eventos?publicacion=published"));
  const row = page.getByRole("row").filter({ hasText: "Evento E2E Historial" });
  await row.getByRole("button", { name: "Enviar a la papelera Evento E2E Historial" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar a la papelera" }).click();
  // Se espera el aviso de la action: mientras la lista se recarga la fila desaparece un instante aunque aún no se haya enviado.
  await expect(page.getByText("Enviado a la papelera").first()).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Evento E2E Historial" })).toHaveCount(0);

  await page.goto("/boxeadores/ruth-huaman");
  await expect(rows).toHaveCount(2);
  await expect(page.getByText("Evento E2E Historial")).toHaveCount(0);
});

test("la galería solo aparece con fotos y se recorre con las flechas del teclado", async ({ page }) => {
  test.setTimeout(90_000);
  const division = await divisionIdBySlug(db, "peso-superligero");
  const photos = await Promise.all(
    ["Primera foto E2E", "Segunda foto E2E"].map(async (alt) => {
      const [row] = await db
        .insert(media)
        .values({ kind: "gallery", originalKey: "originals/gallery/e2e.png", mime: "image/png", width: 800, height: 600, status: "ready", alt })
        .returning({ id: media.id });
      return row!.id;
    }),
  );
  const created = await createFighter(db, { ...validFighterInput(division, { firstName: "Galería", lastName: "Prueba", nickname: null }), galleryMediaIds: photos }, "e2e");
  await setFighterPublication(db, created.id, { status: "published", publishAt: null }, "e2e");

  await page.goto("/boxeadores/galeria-prueba");
  const gallery = page.locator('[data-slot="fighter-gallery"]');
  await expect(gallery.getByRole("heading", { name: "Galería" })).toBeVisible();
  const thumbnails = gallery.getByRole("button", { name: /Ver foto/ });
  await expect(thumbnails).toHaveCount(2);

  await thumbnails.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img", { name: "Primera foto E2E" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("img", { name: "Segunda foto E2E" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("img", { name: "Primera foto E2E" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Sin fotos, no hay sección de galería.
  await page.goto("/boxeadores/bryan-cevallos");
  await expect(page.locator('[data-slot="fighter-gallery"]')).toHaveCount(0);
});

for (const width of [320, 375, 768, 1440]) {
  test(`la ficha con historial no tiene scroll horizontal a ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/boxeadores/jordan-quinonez");
    await expect(page.locator("[data-fight]")).toHaveCount(3);
    await expectNoHorizontalScroll(page);
  });
}
