import { expect, test, type Page } from "@playwright/test";
import { db } from "@/db";
import { addBout, saveSegment } from "@/features/events/card-service";
import { createEvent } from "@/features/events/service";
import { updateFighter } from "@/features/fighters/service";
import { saveRanking, setChampion } from "@/features/rankings/service";
import { getCurrentRanking } from "@/features/rankings/versions";
import { recordBoutResult } from "@/features/results/service";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";
import { createRankableFighter, divisionIdOf } from "./fixtures/rankings";

// Todo el spec usa la división Medio (nadie más la toca): sus pruebas van una tras otra, y cada una deja armado lo que necesita.
test.describe.configure({ mode: "serial" });

const MEDIO = "peso-mediano";
const EDITOR_URL = adminUrl("/rankings/pro/peso-medio");

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function currentRankingOf(divisionId: string): Promise<string[]> {
  return (await getCurrentRanking(db, { level: "pro", divisionId }))?.fighterIds ?? [];
}

/** Cuatro boxeadores de la división con apellidos únicos (`<label>Uno`…) y el ranking [Uno, Dos, Tres]; `Nuevo` queda sin ranking. */
async function arrangeDivision(label: string) {
  const divisionId = await divisionIdOf(MEDIO);
  const [uno, dos, tres, nuevo] = await Promise.all(
    ["Uno", "Dos", "Tres", "Nuevo"].map((suffix) => createRankableFighter(MEDIO, "Medio", `${label}${suffix}`)),
  );
  await saveRanking(db, { level: "pro", divisionId }, [uno!.id, dos!.id, tres!.id], "e2e");
  return { divisionId, uno: uno!, dos: dos!, tres: tres!, nuevo: nuevo! };
}

/** Un evento (cada prueba, en una fecha posterior) con una pelea terminada en Medio: gana la esquina roja. */
async function eventWithResult(name: string, date: string, winnerId: string, loserId: string) {
  const divisionId = await divisionIdOf(MEDIO);
  const event = await createEvent(
    db,
    { name, startsDate: date, startsTime: "21:00", venueName: "Arena Santiago", venueAddress: "Av. Ejemplo 1234", venueCity: "Santiago", status: "published" },
    "e2e",
  );
  const segment = await saveSegment(db, event.id, { name: "Cartelera estelar" }, "e2e");
  const bout = await addBout(db, segment.id, { redFighterId: winnerId, blueFighterId: loserId, divisionId }, "e2e");
  const result = await recordBoutResult(db, bout.id, { outcome: "red_win", method: "decision", decisionType: "unanimous", endRound: 3, endTimeSeconds: 300 }, "e2e");
  if (!result.ok) throw new Error(`No se pudo cargar el resultado: ${JSON.stringify(result.errors)}`);
  return event;
}

test("tras cargar un resultado, la sugerencia se acepta, se guarda y queda en una versión nueva", async ({ browser }) => {
  test.setTimeout(120_000);
  const { divisionId, uno, dos, tres, nuevo } = await arrangeDivision("Sug");
  await eventWithResult("Noche E2E Sugerencias", "2031-10-11", nuevo.id, tres.id);

  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await signInAsAdmin(page);
  await page.goto(EDITOR_URL);

  const suggestion = "SugNuevo (sin ranking) venció a SugTres (#3)";
  await expect(page.getByRole("heading", { name: /Sugerencias tras Noche E2E Sugerencias/ })).toBeVisible();
  // `.first()`: mientras Next transmite la página el texto puede existir dos veces por un instante (strict mode falla sin reintentar).
  await expect(page.getByText(suggestion).first()).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: `Aceptar: ${suggestion}` }).click();
  // Aceptar solo cambia el borrador: nada se guardó todavía.
  await expect(page.getByText("Cambios sin guardar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Subir a Medio SugNuevo" })).toBeVisible();
  expect(await currentRankingOf(divisionId)).toEqual([uno.id, dos.id, tres.id]);
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "Guardar nueva versión" }).click();
  await expect(page.getByText("Nueva versión del ranking guardada")).toBeVisible();
  // Entra en el puesto 3 y quien lo tenía baja al 4.
  await expect.poll(() => currentRankingOf(divisionId)).toEqual([uno.id, dos.id, nuevo.id, tres.id]);
  // Ya aplicada: no vuelve a sugerirse.
  await page.reload();
  await expect(page.getByText(suggestion)).toHaveCount(0);

  // En el sitio: el que entró es NUEVO en el puesto 3 y el que estaba ahí bajó un puesto.
  await page.goto("/rankings");
  const medio = page.getByRole("article", { name: "Ranking Peso Medio" });
  await expect(medio.getByRole("listitem").nth(2)).toContainText("Medio SugNuevo");
  await expect(medio.getByRole("listitem").nth(2).getByLabel("Nuevo en el ranking")).toBeVisible();
  await expect(medio.getByRole("listitem").nth(3).getByLabel("Baja 1 puesto")).toBeVisible();
  await context.close();
});

test("descartar una sugerencia la quita y no vuelve a salir", async ({ page }) => {
  test.setTimeout(120_000);
  const { divisionId, tres, nuevo, uno } = await arrangeDivision("Desc");
  await eventWithResult("Noche E2E Descartes", "2031-10-18", nuevo.id, tres.id);
  await signInAsAdmin(page);
  await page.goto(EDITOR_URL);

  const suggestion = "DescNuevo (sin ranking) venció a DescTres (#3)";
  // `.first()`: mientras Next transmite la página el texto puede existir dos veces por un instante (strict mode falla sin reintentar).
  await expect(page.getByText(suggestion).first()).toBeVisible();
  await page.getByRole("button", { name: `Descartar: ${suggestion}` }).click();
  await expect(page.getByText(suggestion)).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Puestos (3 de 5)" })).toBeVisible();
  await expect(page.getByText(suggestion)).toHaveCount(0);
  expect((await currentRankingOf(divisionId))[0]).toBe(uno.id);
});

test("ordenar con los botones, agregar con el buscador de elegibles y quitar", async ({ page }) => {
  test.setTimeout(120_000);
  const { divisionId, uno, dos, tres, nuevo } = await arrangeDivision("Ord");
  await signInAsAdmin(page);
  await page.goto(EDITOR_URL);

  await page.getByRole("button", { name: "Subir a Medio OrdTres" }).click();
  await page.getByRole("button", { name: "Quitar a Medio OrdUno del ranking" }).click();

  // El buscador solo ofrece elegibles: un boxeador en borrador (los «Cartel…» del e2e) no aparece.
  await page.getByLabel("Agregar boxeador").fill("Cartel");
  await expect(page.getByText(/Ningún boxeador elegible coincide/)).toBeVisible();
  await page.getByLabel("Agregar boxeador").fill("OrdNuevo");
  await page.getByRole("button", { name: /Medio OrdNuevo/ }).click();
  await expect(page.getByRole("heading", { name: "Puestos (3 de 5)" })).toBeVisible();

  await page.getByRole("button", { name: "Guardar nueva versión" }).click();
  await expect(page.getByText("Nueva versión del ranking guardada")).toBeVisible();
  await expect.poll(() => currentRankingOf(divisionId)).toEqual([tres.id, dos.id, nuevo.id]);
  expect(uno.id).toBeDefined();
});

test("un campeón no se puede dejar en el ranking numerado y un retirado se avisa", async ({ page }) => {
  test.setTimeout(120_000);
  const { divisionId, uno, dos } = await arrangeDivision("Ret");
  await signInAsAdmin(page);
  await updateFighter(
    db,
    dos.id,
    { firstName: "Medio", lastName: "RetDos", gender: "male", nationality: "CL", divisionId, careerStatus: "retired", proWins: 3 },
    "e2e",
  );
  await page.goto(EDITOR_URL);

  await expect(page.getByText("Medio RetDos está retirado: quítalo del ranking").first()).toBeVisible();
  await page.goto(adminUrl("/rankings"));
  await expect(page.getByText("Medio RetDos está retirado: quítalo del ranking")).toBeVisible();

  // Coronar a quien está #1 lo saca del ranking numerado.
  await setChampion(db, "pro", divisionId, uno.id, "e2e");
  expect((await currentRankingOf(divisionId)).includes(uno.id)).toBe(false);
});

test("coronar a otro campeón y dejar el título vacante desde el panel", async ({ page }) => {
  test.setTimeout(120_000);
  const { divisionId, uno, dos } = await arrangeDivision("Cor");
  await setChampion(db, "pro", divisionId, dos.id, "e2e");
  await signInAsAdmin(page);
  await page.goto(EDITOR_URL);

  await expect(page.getByRole("heading", { name: "Campeón pro" })).toBeVisible();
  await expect(page.getByText("Medio CorDos").first()).toBeVisible();
  await page.getByRole("button", { name: "Cambiar campeón" }).click();
  await page.getByLabel("Nuevo campeón").fill("CorUno");
  await page.getByRole("status").getByRole("button", { name: /Medio CorUno/ }).click();

  const dialog = page.getByRole("dialog", { name: "Cambio de título" });
  await expect(dialog.getByText("Medio CorUno es el nuevo campeón pro de Peso Medio. ¿Confirmar?")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar cambio" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await currentRankingOf(divisionId)).includes(uno.id)).toBe(false);
  await expect(page.getByRole("button", { name: "Dejar vacante" })).toBeVisible();

  await page.getByRole("button", { name: "Dejar vacante" }).click();
  await page.getByRole("button", { name: "Sí, dejar vacante" }).click();
  await expect(page.getByText("Título vacante.")).toBeVisible();
});

test("la lista de rankings: Pro y Amateur, libra por libra primero y cada división", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(adminUrl("/rankings"));

  await expect(page.getByRole("heading", { name: "Rankings y títulos", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Libra por libra", level: 2 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar el ranking de Peso Ligero" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("link", { name: "Amateur" }).click();
  await expect(page).toHaveURL(/nivel=amateur/);
  await expect(page.getByRole("link", { name: "Amateur" })).toHaveAttribute("aria-current", "page");
});
