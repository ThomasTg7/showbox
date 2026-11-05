import { and, eq } from "drizzle-orm";
import { expect, test, type Page } from "@playwright/test";
import { db } from "@/db";
import { titles } from "@/db/schema/rankings";
import { setChampion } from "@/features/rankings/service";
import { getCurrentRanking } from "@/features/rankings/versions";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";
import { createRankableFighter, createTitleFightEvent, divisionIdOf } from "./fixtures/rankings";

const current = (page: Page) => page.getByRole("region", { name: "Pelea actual" });

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("el retador gana la pelea titular: el diálogo pide confirmar y corona al nuevo campeón", async ({ browser }) => {
  test.setTimeout(120_000);
  const division = await divisionIdOf("peso-semipesado");
  const champion = await createRankableFighter("peso-semipesado", "Campeón", "TituloUno");
  const challenger = await createRankableFighter("peso-semipesado", "Retador", "TituloDos");
  await setChampion(db, "pro", division, champion.id, "e2e");
  const card = await createTitleFightEvent("Noche E2E Cambio de Título", "peso-semipesado", champion.id, challenger.id);

  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await signInAsAdmin(page);
  await page.goto(adminUrl(`/eventos/${card.eventId}/en-vivo`));
  const started = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/en-vivo"));
  await page.getByRole("button", { name: "Abrir la noche de pelea" }).click();
  await started;

  await current(page).getByRole("button", { name: "AZUL · TituloDos" }).click();
  await current(page).getByRole("button", { name: "Decisión", exact: true }).click();
  await current(page).getByRole("button", { name: "Unánime" }).click();
  await page.getByRole("button", { name: "Guardar y terminar la noche" }).click();

  // Gana el retador: se pregunta antes de coronar y no cambia nada hasta confirmar.
  const dialog = page.getByRole("dialog", { name: "Cambio de título" });
  await expect(dialog.getByText("Retador TituloDos es el nuevo campeón pro de Peso Semipesado. ¿Confirmar?")).toBeVisible();
  await expect(dialog.getByText(/Hoy el título es de Campeón TituloUno/)).toBeVisible();
  await expectNoHorizontalScroll(page);
  const stillChampion = await db.select().from(titles).where(and(eq(titles.divisionId, division), eq(titles.level, "pro")));
  expect(stillChampion[0]?.championFighterId).toBe(champion.id);

  const confirmed = page.waitForResponse((response) => response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Confirmar cambio" }).click();
  await confirmed;
  await expect(dialog).toHaveCount(0);

  // El retador es el campeón y el campeón anterior queda en el ranking de la división.
  await expect.poll(async () => (await db.select().from(titles).where(and(eq(titles.divisionId, division), eq(titles.level, "pro"))))[0]?.championFighterId).toBe(challenger.id);
  expect((await getCurrentRanking(db, { level: "pro", divisionId: division }))?.fighterIds).toEqual([champion.id]);

  // En el sitio: el retador es el campeón y el campeón anterior aparece en el ranking de la división.
  await page.goto("/rankings");
  const ranking = page.getByRole("article", { name: "Ranking Peso Semipesado" });
  await expect(ranking.getByRole("link", { name: "Retador TituloDos" })).toBeVisible();
  await expect(ranking.getByRole("listitem").first()).toContainText("Campeón TituloUno");
  await context.close();
});

test("«Ahora no» deja el título como estaba", async ({ browser }) => {
  test.setTimeout(120_000);
  const division = await divisionIdOf("peso-pesado");
  const champion = await createRankableFighter("peso-pesado", "Campeón", "SinCambioUno");
  const challenger = await createRankableFighter("peso-pesado", "Retador", "SinCambioDos");
  await setChampion(db, "pro", division, champion.id, "e2e");
  const card = await createTitleFightEvent("Noche E2E Sin Cambio", "peso-pesado", champion.id, challenger.id);

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await signInAsAdmin(page);
  await page.goto(adminUrl(`/eventos/${card.eventId}/en-vivo`));
  const started = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/en-vivo"));
  await page.getByRole("button", { name: "Abrir la noche de pelea" }).click();
  await started;

  await current(page).getByRole("button", { name: "AZUL · SinCambioDos" }).click();
  await current(page).getByRole("button", { name: "Decisión", exact: true }).click();
  await current(page).getByRole("button", { name: "Unánime" }).click();
  await page.getByRole("button", { name: "Guardar y terminar la noche" }).click();

  const dialog = page.getByRole("dialog", { name: "Cambio de título" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Ahora no" }).click();
  await expect(dialog).toHaveCount(0);

  const [title] = await db.select().from(titles).where(and(eq(titles.divisionId, division), eq(titles.level, "pro")));
  expect(title?.championFighterId).toBe(champion.id);
  await context.close();
});
