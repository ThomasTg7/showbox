import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

async function png(width: number, height: number, color: string): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** `YYYY-MM-DD` de mañana en Chile (el formulario escribe la fecha de programación en esa zona). */
function tomorrowInChile(): string {
  return new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
}

/** `YYYY-MM-DD` de ayer en Chile: una fecha pasada pero reciente (se ve en la primera página del listado). */
function yesterdayInChile(): string {
  return new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
}

/** Sube la portada con el editor de imágenes y la guarda. */
async function uploadCover(page: Page) {
  await page.locator('input[type="file"]').first().setInputFiles({ name: "portada.png", mimeType: "image/png", buffer: await png(1600, 900, "#a33") });
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Texto alternativo").fill("Portada de prueba");
  await dialog.getByRole("button", { name: "Guardar imagen" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("img", { name: "Portada de prueba" })).toBeVisible();
}

async function pickRelated(page: Page, label: string, search: string, option: RegExp | string) {
  const field = page.getByRole("group", { name: label });
  const result = field.getByRole("button", { name: option }).first();
  // Si se escribe antes de que React hidrate el formulario, el texto se pierde: se reintenta hasta que aparezca el resultado.
  await expect(async () => {
    await field.getByRole("searchbox").fill("");
    await field.getByRole("searchbox").fill(search);
    await expect(result).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
  await result.click();
}

/** El enlace de la noticia (se ve en la pestaña Datos al editar). */
async function slugOf(page: Page, postId: string): Promise<string> {
  await page.goto(adminUrl(`/noticias/${postId}`));
  return page.getByLabel("Enlace de la noticia").inputValue();
}

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

test("crear una noticia con portada, un video de YouTube y un boxeador, y programarla para mañana", async ({ page }) => {
  test.setTimeout(90_000);
  const title = `Noticia E2E programada ${Date.now()}`;
  await page.goto(adminUrl("/noticias/nueva"));
  await expect(page.getByRole("heading", { name: "Nueva noticia", level: 1 })).toBeVisible();

  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Categoría").selectOption({ label: "Anuncios" });
  await page.getByLabel("Bajada", { exact: true }).fill("Una bajada de prueba para la noticia.");
  await uploadCover(page);

  await page.getByRole("tab", { name: "Texto" }).click();
  const editor = page.getByRole("textbox", { name: "Cuerpo de la noticia" });
  await editor.click();
  await page.keyboard.type("Primer párrafo de la noticia.");
  await page.getByRole("button", { name: "Video o publicación de YouTube, Instagram, TikTok o Facebook" }).click();
  await page.getByLabel("Link de YouTube, Instagram, TikTok o Facebook").fill("https://example.com/no-es-una-red");
  await page.getByRole("button", { name: "Insertar" }).click();
  await expect(page.getByText("Link no reconocido")).toBeVisible();
  await page.getByLabel("Link de YouTube, Instagram, TikTok o Facebook").fill("https://youtu.be/dQw4w9WgXcQ?t=10");
  await page.getByRole("button", { name: "Insertar" }).click();
  await expect(editor.getByText("Publicación de YouTube")).toBeVisible();

  await page.getByRole("tab", { name: "Relacionados" }).click();
  await pickRelated(page, "Boxeadores relacionados", "Bryan", /Bryan Cevallos/);
  await expect(page.getByRole("button", { name: "Quitar a Bryan Cevallos" })).toBeVisible();

  await page.getByRole("tab", { name: "Publicación" }).click();
  await page.getByRole("radio", { name: "Programar" }).check();
  await page.getByLabel("Fecha").fill(tomorrowInChile());
  await page.getByLabel("Hora").fill("10:00");

  await page.getByRole("button", { name: "Crear noticia" }).click();
  await expect(page).toHaveURL(/\/noticias\/[0-9a-f-]+\?creada=1$/);
  const postId = page.url().match(/\/noticias\/([0-9a-f-]+)\?/)![1]!;

  // Lo guardado vuelve completo al abrir la edición.
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(title);
  await expect(page.getByRole("img", { name: "Portada de prueba" })).toBeVisible();
  await page.getByRole("tab", { name: "Texto" }).click();
  await expect(page.getByRole("textbox", { name: "Cuerpo de la noticia" }).getByText("Primer párrafo de la noticia.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Cuerpo de la noticia" }).getByText("Publicación de YouTube")).toBeVisible();
  await page.getByRole("tab", { name: "Relacionados" }).click();
  await expect(page.getByRole("button", { name: "Quitar a Bryan Cevallos" })).toBeVisible();
  await page.getByRole("tab", { name: "Publicación" }).click();
  await expect(page.getByRole("radio", { name: "Programar" })).toBeChecked();

  // En el listado aparece como programada.
  await page.goto(adminUrl("/noticias"));
  await expect(page.getByText(title).first()).toBeVisible();

  // Programada para mañana: no aparece en el sitio ni se puede abrir por su enlace.
  const slug = await slugOf(page, postId);
  await page.goto("/noticias");
  await expect(page.getByRole("heading", { name: "Noticias", level: 1 })).toBeVisible();
  await expect(page.getByText(title)).toHaveCount(0);
  const hidden = await page.goto(`/noticias/${slug}`);
  expect(hidden?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Noticia no encontrada" })).toBeVisible();

  // Reprogramarla para una fecha ya pasada desde el formulario la publica al instante (la action invalida la caché).
  await page.goto(adminUrl(`/noticias/${postId}`));
  await page.getByRole("tab", { name: "Publicación" }).click();
  await page.getByLabel("Fecha").fill(yesterdayInChile());
  await page.getByLabel("Hora").fill("08:30");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados").first()).toBeVisible();

  await page.goto("/noticias");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.goto(`/noticias/${slug}`);
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  await expect(page.getByText("Primer párrafo de la noticia.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reproducir video de YouTube" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Bryan Cevallos/ })).toHaveAttribute("href", "/boxeadores/bryan-cevallos");
  await expect(page.locator("main img, article img").first()).toBeVisible();
});

test("en el editor se ve la publicación real: pegar un reel de Instagram lo muestra y «Quitar» lo saca", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(adminUrl("/noticias/nueva"));
  await page.getByRole("tab", { name: "Texto" }).click();
  const editor = page.getByRole("textbox", { name: "Cuerpo de la noticia" });
  await editor.click();
  await page.keyboard.type("Mira el reel:");
  await page.keyboard.press("Enter");
  await page.evaluate(() => navigator.clipboard.writeText("https://www.instagram.com/reel/C9xYz12AbCd/?igsh=MWQ1ZGUxMzBkMA=="));
  await page.keyboard.press("ControlOrMeta+v");

  const frame = editor.locator("iframe");
  await expect(frame).toHaveAttribute("src", "https://www.instagram.com/p/C9xYz12AbCd/embed");
  await expect(frame).toHaveAttribute("sandbox", /allow-scripts/);
  await editor.getByRole("button", { name: "Quitar" }).click();
  await expect(editor.locator("iframe")).toHaveCount(0);
  await expect(editor.getByText("Mira el reel:")).toBeVisible();
});

test("con IA: subir una foto y describirla, copiar las instrucciones, pegar la respuesta, cargarla, copiarla de vuelta, deshacer y guardar", async ({ page, context }) => {
  test.setTimeout(90_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const title = `Noticia IA E2E ${Date.now()}`;
  await page.goto(adminUrl("/noticias/nueva"));
  await page.getByRole("tab", { name: "Texto" }).click();

  await page.getByRole("button", { name: "Con IA", exact: true }).click();
  const writer = page.locator('[data-slot="ai-writer"]');
  await expect(writer.getByText("La IA no puede ver, crear ni subir fotos.")).toBeVisible();

  // Paso 1: la foto y lo que muestra.
  await writer.locator('input[type="file"]').setInputFiles({ name: "foto-ia.png", mimeType: "image/png", buffer: await png(1200, 800, "#3a6") });
  await expect(writer.getByText("FOTO 1", { exact: true })).toBeVisible();
  await writer.getByLabel("¿Qué muestra la foto 1?").fill("Cevallos levantando el cinturón");

  // Paso 2: lo que pasó y las instrucciones completas, con los datos y la foto.
  await writer.getByLabel("¿Qué pasó?").fill("Cevallos venció a Quiñónez por KO en el segundo round.");
  await writer.getByRole("button", { name: "Copiar instrucciones para la IA" }).click();
  await expect(page.getByText("Instrucciones copiadas")).toBeVisible();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain("Cevallos venció a Quiñónez por KO en el segundo round.");
  expect(prompt).toContain("FOTO 1: Cevallos levantando el cinturón");

  // Paso 3: la respuesta (con un saludo antes, como suele hacer la IA) y lo que se detectó.
  await writer.getByRole("textbox", { name: "Respuesta de la IA" }).fill(
    ["¡Claro! Aquí tienes la noticia:", "", `TÍTULO: ${title}`, "BAJADA: Una bajada escrita por la IA.", "", "## La previa", "", "Cevallos llega **invicto** al combate.", "", "[FOTO 1]", "", "Mira el KO: https://youtu.be/dQw4w9WgXcQ", "", "[FOTO 2]"].join("\n"),
  );
  const detected = writer.getByRole("list", { name: "Lo que se cargará" });
  await expect(detected.getByText(`Título: «${title}»`)).toBeVisible();
  await expect(detected.getByText("1 video de YouTube")).toBeVisible();
  await writer.getByRole("button", { name: "Cargar en la noticia" }).click();
  await expect(page.getByText("Texto cargado en la noticia")).toBeVisible();
  await expect(writer.getByText("[FOTO 2] no se insertó")).toBeAttached();

  // Vuelve al editor con el texto convertido; el saludo y «TÍTULO:» no quedan en el cuerpo.
  const editor = page.getByRole("textbox", { name: "Cuerpo de la noticia" });
  await expect(editor).not.toContainText("TÍTULO");
  await expect(editor).not.toContainText("Aquí tienes");
  await expect(editor.getByRole("heading", { name: "La previa" })).toBeVisible();
  await expect(editor.locator("strong", { hasText: "invicto" })).toBeVisible();
  await expect(editor.locator("figure img")).toHaveCount(1);
  await expect(editor.locator("iframe")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);

  // «Copiar noticia para la IA» devuelve la versión actual en el mismo formato.
  await page.getByRole("button", { name: "Con IA", exact: true }).click();
  await writer.getByRole("button", { name: "Copiar noticia para la IA" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(`TÍTULO: ${title}`);
  expect(copied).toContain("Cevallos llega **invicto** al combate.");
  expect(copied).toContain("[FOTO 1]");
  expect(copied).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  // Deshacer deja todo como estaba; volver a cargar lo repone.
  await page.getByRole("tab", { name: "Datos" }).click();
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(title);
  await expect(page.getByLabel("Bajada", { exact: true })).toHaveValue("Una bajada escrita por la IA.");
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue("");
  // Al cerrarse, el aviso devuelve el foco a la pestaña Datos (y Radix la activa): se espera a que termine.
  await expect(page.getByRole("button", { name: "Deshacer" })).toBeHidden();
  await page.getByRole("tab", { name: "Texto" }).click();
  await expect(page.getByRole("tab", { name: "Texto" })).toHaveAttribute("aria-selected", "true");
  await expect(editor.getByRole("heading", { name: "La previa" })).toHaveCount(0);
  await page.getByRole("button", { name: "Con IA", exact: true }).click();
  await writer.getByRole("button", { name: "Cargar en la noticia" }).click();
  await expect(editor.getByRole("heading", { name: "La previa" })).toBeVisible();

  await page.getByRole("tab", { name: "Datos" }).click();
  await page.getByLabel("Categoría").selectOption({ label: "Anuncios" });
  await page.getByRole("button", { name: "Crear noticia" }).click();
  await expect(page).toHaveURL(/\/noticias\/[0-9a-f-]+\?creada=1$/);
  await page.getByRole("tab", { name: "Texto" }).click();
  await expect(editor.getByRole("heading", { name: "La previa" })).toBeVisible();
  await expect(editor.locator("figure img")).toHaveCount(1);
});

test("pegar la respuesta de la IA en «Escribir» la carga entera: el título y la bajada van a Datos, no al cuerpo", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(adminUrl("/noticias/nueva"));
  await page.getByRole("tab", { name: "Texto" }).click();
  const editor = page.getByRole("textbox", { name: "Cuerpo de la noticia" });
  await editor.click();
  await page.evaluate(() =>
    navigator.clipboard.writeText("Aquí está la noticia:\n\nTÍTULO: Caicedo defiende en casa\nBAJADA: La campeona vuelve a Santiago.\n\nPrimer párrafo pegado."),
  );
  await page.keyboard.press("ControlOrMeta+v");

  await expect(page.getByText("Texto cargado en la noticia")).toBeVisible();
  await expect(editor.getByText("Primer párrafo pegado.")).toBeVisible();
  await expect(editor).not.toContainText("TÍTULO");
  await page.getByRole("tab", { name: "Datos" }).click();
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue("Caicedo defiende en casa");
  await expect(page.getByLabel("Bajada", { exact: true })).toHaveValue("La campeona vuelve a Santiago.");
});

test("la vista previa en vivo muestra la noticia como en el sitio y cambia al escribir, en celular y en PC", async ({ page }) => {
  await page.goto(adminUrl("/noticias/nueva"));
  const preview = page.locator('[data-slot="post-live-preview"]');
  const frame = page.frameLocator('iframe[title^="Vista previa de la noticia"]');
  // Sin título todavía: un texto de muestra para juzgar el diseño.
  await expect(frame.getByRole("heading", { level: 1, name: "Título de la noticia" })).toBeVisible();

  await page.getByLabel("Título", { exact: true }).fill("Caicedo defiende en casa");
  await page.getByLabel("Categoría").selectOption({ label: "Resultados" });
  await page.getByLabel("Bajada", { exact: true }).fill("La campeona vuelve a Santiago.");
  await expect(frame.getByRole("heading", { level: 1, name: "Caicedo defiende en casa" })).toBeVisible();
  await expect(frame.getByText("La campeona vuelve a Santiago.")).toBeVisible();
  await expect(frame.getByText("Resultados", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Texto" }).click();
  await page.getByRole("textbox", { name: "Cuerpo de la noticia" }).click();
  await page.keyboard.type("Primer párrafo en vivo.");
  await expect(frame.getByText("Primer párrafo en vivo.")).toBeVisible();

  // Celular: 375 px de verdad; PC: 1440 px achicado para que quepa.
  const iframe = page.locator('iframe[title^="Vista previa de la noticia"]');
  expect(await iframe.evaluate((element) => (element as HTMLIFrameElement).contentWindow!.innerWidth)).toBe(375);
  await preview.getByRole("button", { name: "PC" }).click();
  await expect(iframe).toHaveAttribute("title", "Vista previa de la noticia en pc");
  await expect.poll(() => iframe.evaluate((element) => (element as HTMLIFrameElement).contentWindow!.innerWidth)).toBe(1440);
  await expect(frame.getByText("Primer párrafo en vivo.")).toBeVisible();

  await preview.getByRole("button", { name: "Ocultar" }).click();
  await expect(iframe).toHaveCount(0);
  await preview.getByRole("button", { name: "Mostrar" }).click();
  await expect(frame.getByRole("heading", { level: 1, name: "Caicedo defiende en casa" })).toBeVisible();
});

test("el texto va justificado y cada párrafo se puede alinear por separado", async ({ page }) => {
  await page.goto(adminUrl("/noticias/nueva"));
  await page.getByRole("tab", { name: "Texto" }).click();
  const editor = page.getByRole("textbox", { name: "Cuerpo de la noticia" });
  await editor.click();
  await page.keyboard.type("Párrafo justificado.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Párrafo centrado.");
  const alignment = page.getByRole("group", { name: "Alineación" });
  await expect(alignment.getByRole("button", { name: "Justificar" })).toHaveAttribute("aria-pressed", "true");
  await alignment.getByRole("button", { name: "Centrar" }).click();

  // En el editor solo cambia el párrafo del cursor.
  await expect(editor.getByText("Párrafo centrado.")).toHaveCSS("text-align", "center");
  await expect(editor.getByText("Párrafo justificado.")).toHaveCSS("text-align", "justify");
  // Y la vista previa (igual que el sitio) lo muestra así.
  const frame = page.frameLocator('iframe[title^="Vista previa de la noticia"]');
  await expect(frame.getByText("Párrafo centrado.")).toHaveCSS("text-align", "center");
  await expect(frame.getByText("Párrafo justificado.")).toHaveCSS("text-align", "justify");
});

test("el listado y el formulario no desbordan en celular ni en PC", async ({ page }) => {
  for (const size of [{ width: 375, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const path of ["/noticias", "/noticias/nueva", "/noticias/categorias"] as const) {
      await page.goto(adminUrl(path));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  }
});

test("enviar el formulario vacío muestra los errores junto al campo y abre la pestaña con el primero", async ({ page }) => {
  await page.goto(adminUrl("/noticias/nueva"));
  await page.getByRole("tab", { name: "Texto" }).click();
  await page.getByRole("button", { name: "Crear noticia" }).click();
  await expect(page.getByText("El título es obligatorio")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Datos" })).toHaveAttribute("aria-selected", "true");
});

test("las categorías se agregan, renombran, ordenan y eliminan (una con noticias no)", async ({ page }) => {
  const name = `Categoría E2E ${Date.now()}`;
  await page.goto(adminUrl("/noticias/categorias"));
  await expect(page.getByRole("heading", { name: "Categorías de noticias", level: 1 })).toBeVisible();

  await page.getByLabel("Nueva categoría").fill(name);
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Renombrar ${name}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre").fill(`${name} editada`);
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(`${name} editada`, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Eliminar ${name} editada` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText(`${name} editada`, { exact: true })).toHaveCount(0);

  // «Anuncios» tiene noticias sembradas: no se puede eliminar.
  await expect(page.getByRole("button", { name: "Eliminar Anuncios" })).toBeDisabled();
});

test("una noticia se publica y se envía a la papelera desde el listado", async ({ page }) => {
  const title = `Noticia E2E listado ${Date.now()}`;
  await page.goto(adminUrl("/noticias/nueva"));
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Categoría").selectOption({ label: "Resultados" });
  await page.getByRole("button", { name: "Crear noticia" }).click();
  await expect(page).toHaveURL(/\/noticias\/[0-9a-f-]+\?creada=1$/);

  await page.goto(adminUrl(`/noticias?q=${encodeURIComponent(title)}`));
  await expect(page.getByText(title).first()).toBeVisible();
  const publish = page.getByRole("button", { name: `Publicar ${title}` }).first();
  await publish.click();
  await expect(page.getByText("Noticia publicada").first()).toBeVisible();
  await expect(page.getByRole("button", { name: `Pasar a borrador ${title}` }).first()).toBeVisible();

  await page.getByRole("button", { name: `Enviar a la papelera ${title}` }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar a la papelera" }).click();
  await expect(page.getByText("Enviada a la papelera").first()).toBeVisible();
  await page.goto(adminUrl(`/noticias?q=${encodeURIComponent(title)}`));
  await expect(page.getByText("Ninguna noticia coincide")).toBeVisible();
  await page.goto("/noticias");
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);

  // Restaurarla la devuelve al sitio sin esperar la caché.
  await page.goto(adminUrl("/papelera"));
  await page.getByRole("listitem").or(page.getByRole("row")).filter({ hasText: title }).getByRole("button", { name: "Restaurar" }).click();
  await expect(page.getByText(title)).toHaveCount(0);
  await page.goto("/noticias");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});
