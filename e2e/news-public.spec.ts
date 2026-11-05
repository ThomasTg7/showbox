import { expect, test, type Page } from "@playwright/test";
import { db } from "@/db";
import { insertMedia } from "@/features/fighters/test-helpers";
import { categoryIdBySlug } from "@/features/posts/test-helpers";
import { createPost } from "@/features/posts/service";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("el filtro de categoría muestra solo las noticias de esa categoría", async ({ page }) => {
  await page.goto("/noticias?categoria=entrevistas");
  await expect(page.getByRole("heading", { name: "Entrevistas", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quiñónez: «Vengo a llevarme el cinturón a Argentina»/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Caicedo: «Quiero defender el título cada año»/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Así fue: Caicedo somete/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Entrevistas", exact: true })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "Todas", exact: true }).click();
  await expect(page).toHaveURL(/\/noticias$/);
  await expect(page.getByRole("link", { name: /Así fue: Caicedo somete/ })).toBeVisible();
});

test("una categoría que no existe muestra un vacío digno", async ({ page }) => {
  await page.goto("/noticias?categoria=no-existe");
  await expect(page.getByText("Todavía no hay noticias en esta categoría")).toBeVisible();
});

test("el listado pagina de a 12 con «Siguiente» y «Anterior»", async ({ page }) => {
  await page.goto("/noticias");
  await expect(page.locator("article[data-post]")).toHaveCount(12);
  await page.getByRole("link", { name: "Siguiente" }).click();
  await expect(page).toHaveURL(/\/noticias\?pagina=2$/);
  await expect(page.locator("article[data-post]").first()).toBeVisible();
  expect(await page.locator("article[data-post]").count()).toBeLessThan(12);
  await expect(page.getByRole("link", { name: "Siguiente" })).toHaveCount(0);
  await page.getByRole("link", { name: "Anterior" }).click();
  await expect(page).toHaveURL(/\/noticias$/);
});

test("una noticia muestra portada de marca, cuerpo, video con fachada, boxeadores relacionados y copiar el link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/noticias");
  await page.getByRole("link", { name: /Así fue: Caicedo somete en el primer round/ }).click();

  await expect(page.getByRole("heading", { name: "Así fue: Caicedo somete en el primer round", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  // Sin portada: fondo de la marca, nunca una imagen rota.
  await expect(page.locator('[data-slot="post-cover-fallback"]')).toBeVisible();
  await expect(page.getByText("La campeona peso paja no necesitó más de tres minutos")).toBeVisible();

  // El reproductor de YouTube no se carga hasta que se toca (antes solo se ve la imagen fija del video).
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Reproducir video de YouTube" }).click();
  await expect(page.locator("iframe")).toHaveAttribute("src", /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);

  const related = page.locator('[data-slot="post-related"]');
  await expect(related.getByRole("link", { name: /Mishel Caicedo/ })).toHaveAttribute("href", "/boxeadores/mishel-caicedo");
  await expect(related.getByRole("link", { name: /ShowBox Fight Night 1/ })).toHaveAttribute("href", "/eventos/showbox-fight-night-1");

  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link copiado" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/noticias/asi-fue-caicedo-somete-en-el-primer-round");

  await related.getByRole("link", { name: /Mishel Caicedo/ }).click();
  await expect(page).toHaveURL(/\/boxeadores\/mishel-caicedo$/);
});

test("la galería se abre con un toque, se recorre con las flechas y se cierra con Escape", async ({ page }) => {
  const [photoA, photoB] = [await insertMedia(db, "gallery", { alt: "Foto uno" }), await insertMedia(db, "gallery", { alt: "Foto dos" })];
  const { slug } = await createPost(
    db,
    { title: `Noticia E2E con galería ${Date.now()}`, categoryId: await categoryIdBySlug(db, "anuncios"), status: "published", galleryMediaIds: [photoA, photoB] },
    "e2e",
  );

  await page.goto(`/noticias/${slug}`);
  await expect(page.getByRole("heading", { name: "Galería", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /Ver foto 1 de 2/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("1 / 2");
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toContainText("2 / 2");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("un borrador y una noticia programada no se pueden abrir por su enlace", async ({ page }) => {
  const categoryId = await categoryIdBySlug(db, "resultados");
  const stamp = Date.now();
  const draft = await createPost(db, { title: `Borrador E2E ${stamp}`, categoryId }, "e2e");
  const scheduled = await createPost(db, { title: `Programada E2E ${stamp}`, categoryId, status: "scheduled", publishAt: new Date(Date.now() + 86_400_000) }, "e2e");

  for (const { slug } of [draft, scheduled]) {
    const response = await page.goto(`/noticias/${slug}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Noticia no encontrada" })).toBeVisible();
  }
  const forged = await page.goto(`/noticias/${draft.slug}?preview=inventado`);
  expect(forged?.status()).toBe(404);
});

test("en las tarjetas, la categoría, el título y la bajada no se tocan (celular y PC)", async ({ page }) => {
  for (const size of [{ width: 375, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto("/noticias");
    await expect(page.locator("article[data-post]").first()).toBeVisible();
    const cards = await page.locator("article[data-post]").evaluateAll((articles) =>
      articles.map((article) => {
        const meta = article.querySelector('[data-slot="post-card-meta"]')!.getBoundingClientRect();
        const title = article.querySelector("h2, h3")!;
        const titleBox = title.getBoundingClientRect();
        const excerpt = article.querySelector('[data-slot="post-card-excerpt"]')?.getBoundingClientRect();
        const style = getComputedStyle(title);
        return {
          slug: (article as HTMLElement).dataset.post,
          metaGap: titleBox.top - meta.bottom,
          excerptGap: excerpt ? excerpt.top - titleBox.bottom : null,
          // Con interlineado menor a 1, las tildes de las mayúsculas (É, Ó) suben sobre la línea de arriba.
          leading: parseFloat(style.lineHeight) / parseFloat(style.fontSize),
        };
      }),
    );
    for (const card of cards) {
      expect(card.metaGap, `${card.slug} (${size.width}px): categoría pegada al título`).toBeGreaterThanOrEqual(8);
      if (card.excerptGap !== null) expect(card.excerptGap, `${card.slug} (${size.width}px): bajada pegada al título`).toBeGreaterThanOrEqual(8);
      expect(card.leading, `${card.slug} (${size.width}px): interlineado del título`).toBeGreaterThanOrEqual(1);
    }
  }
});

test("el listado y una noticia no desbordan en celular ni en PC", async ({ page }) => {
  for (const size of [{ width: 320, height: 800 }, { width: 375, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto("/noticias");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto("/noticias/asi-fue-caicedo-somete-en-el-primer-round");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Reproducir video de YouTube" }).click();
    await expectNoHorizontalScroll(page);
  }
});
