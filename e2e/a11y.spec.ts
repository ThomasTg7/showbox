import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { db } from "@/db";
import { insertPost } from "@/features/posts/test-helpers";
import { adminUrl } from "./fixtures/admin";

// Accesibilidad con axe (WCAG 2.0/2.1 A y AA) en las pantallas públicas y en el ingreso al panel: 0 violaciones graves
// (`serious`) o críticas. Se espera a que el contenido esté a la vista: lo que una animación aún esconde no se puede medir.

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({ rule: violation.id, impact: violation.impact, help: violation.help, where: violation.nodes.slice(0, 4).map((node) => `${node.target.join(" ")} :: ${node.html.slice(0, 140)} :: ${node.any.map((check) => check.message).join("; ")}`) }));
  expect(serious).toEqual([]);
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  // Hidratación terminada.
  await page.waitForLoadState("networkidle");
  await revealEverything(page);
}

/** Recorre la página como una persona: las secciones de abajo aparecen al llegar a ellas y axe debe medirlas ya visibles. */
async function revealEverything(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
  });
  // Termina la última animación de entrada (todas duran menos de un segundo).
  await page.waitForTimeout(1200);
}

const PAGES = [
  { name: "la home", path: "/" },
  { name: "/boxeadores", path: "/boxeadores" },
  { name: "la ficha de un boxeador", path: "/boxeadores/bryan-cevallos" },
  { name: "la página de un evento", path: "/eventos/showbox-fight-night-5" },
  { name: "un evento ya jugado", path: "/eventos/showbox-fight-night-4" },
  { name: "/rankings", path: "/rankings" },
  { name: "/noticias", path: "/noticias" },
  { name: "una noticia con video de YouTube", path: "/noticias/asi-fue-caicedo-somete-en-el-primer-round" },
  { name: "/quiero-pelear", path: "/quiero-pelear" },
  { name: "/patrocinar", path: "/patrocinar" },
  { name: "/contacto", path: "/contacto" },
  { name: "/entradas", path: "/entradas" },
];

for (const { name, path } of PAGES) {
  test(`${name} no tiene violaciones graves de accesibilidad`, async ({ page }) => {
    await open(page, path);
    await expectNoSeriousViolations(page);
  });
}

test("una noticia con publicaciones de Instagram, TikTok y Facebook no tiene violaciones graves", async ({ page }) => {
  const embed = (provider: "instagram" | "tiktok" | "facebook", id: string) => ({ type: "embed" as const, attrs: { provider, id } });
  const { slug } = await insertPost(db, {
    slug: "noticia-e2e-a11y-redes",
    title: "Noticia E2E con redes",
    body: { type: "doc", content: [embed("instagram", "C1a2B3c4D5e"), embed("tiktok", "7123456789012345678"), embed("facebook", "openfightlatam/posts/1234567890")] },
  });
  await open(page, `/noticias/${slug}`);
  await expect(page.getByRole("button", { name: "Ver en Instagram" })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test("el ingreso al panel no tiene violaciones graves", async ({ page }) => {
  await open(page, adminUrl("/login"));
  await expectNoSeriousViolations(page);
});

// En el celular el diseño cambia (menú, carruseles, cartelera): las pantallas principales también se miden a 375 px.
test.describe("a 375 px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const { name, path } of PAGES.filter((item) => ["/", "/boxeadores/bryan-cevallos", "/eventos/showbox-fight-night-5", "/noticias"].includes(item.path))) {
    test(`${name} no tiene violaciones graves de accesibilidad`, async ({ page }) => {
      await open(page, path);
      await expectNoSeriousViolations(page);
    });
  }
});
