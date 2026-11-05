import { randomInt } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { adminUrl, signInAsAdmin } from "./fixtures/admin";

test.describe.configure({ timeout: 90_000 });

// Cada prueba envía desde su propia «dirección»: el límite es de 5 envíos por hora por IP.
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}` });
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function sendApplication(page: Page, name: string) {
  await page.goto("/quiero-pelear");
  await page.getByLabel("Nombre completo").fill(name);
  await page.getByLabel("Correo").fill("postulante@example.cl");
  await page.getByLabel("Teléfono").fill("+593 99 123 4567");
  await page.getByLabel("Fecha de nacimiento").fill("1998-04-12");
  await page.getByLabel("Peso (kg)").fill("70,5");
  await page.getByLabel("Récord").fill("5-1-0");
  await page.getByLabel("Enlace de video 1").fill("https://youtube.com/watch?v=abc");
  await page.getByLabel("Cuéntanos de ti").fill("Quiero pelear en la próxima velada.");
  await page.getByLabel("Acepto la política de privacidad").check();
  await page.getByRole("button", { name: "Enviar postulación" }).click();
  await expect(page.getByText("¡Recibimos tu postulación!")).toBeVisible();
}

test("una postulación enviada llega a la bandeja como «Nuevo», se marca «Contactado» y el filtro por estado la sigue", async ({ page }) => {
  const name = `E2E Bandeja ${randomInt(100000)}`;
  await sendApplication(page, name);

  await signInAsAdmin(page);
  await page.goto(adminUrl("/bandeja"));
  await expect(page.getByRole("heading", { name: "Bandeja", level: 1 })).toBeVisible();
  // Con la página transmitiéndose, un mismo texto puede existir dos veces por un instante: `.first()` (ver decisions.md, Plan 05).
  const row = page.locator("tr", { hasText: name }).first();
  await expect(row).toContainText("Nuevo");
  await expect(row).toContainText("Quiero pelear");
  // La barra lateral avisa que hay mensajes sin responder.
  await expect(page.getByLabel(/mensajes nuevos/)).toBeVisible();

  await row.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await expect(page.getByText("70,5 kg")).toBeVisible();
  await expect(page.getByText("5-1-0")).toBeVisible();
  await expect(page.getByText("Quiero pelear en la próxima velada.")).toBeVisible();
  await expect(page.getByRole("link", { name: "https://youtube.com/watch?v=abc" })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "Responder por email" })).toHaveAttribute("href", /^mailto:postulante@example\.cl\?subject=/);
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/56912345678");

  await page.getByRole("button", { name: "Marcar como contactado" }).click();
  await expect(page.getByText("Marcado como contactado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a nuevo" })).toBeVisible();

  await page.getByRole("link", { name: "Volver a la bandeja" }).click();
  await page.getByRole("navigation", { name: "Estado del mensaje" }).getByRole("link", { name: "Contactados" }).click();
  await expect(page).toHaveURL(/estado=contactados/);
  await expect(page.locator("tr", { hasText: name })).toContainText("Contactado");

  await page.getByRole("navigation", { name: "Estado del mensaje" }).getByRole("link", { name: "Nuevos" }).click();
  await expect(page).toHaveURL(/estado=nuevos/);
  await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
});

test("se puede descartar un mensaje, devolverlo a nuevo y filtrar por tipo", async ({ page }) => {
  const name = `E2E Bandeja Descarte ${randomInt(100000)}`;
  await sendApplication(page, name);

  await signInAsAdmin(page);
  await page.goto(adminUrl("/bandeja?tipo=patrocinio"));
  await expect(page.getByRole("heading", { name: "Bandeja", level: 1 })).toBeVisible();
  await expect(page.locator("tr", { hasText: name })).toHaveCount(0);

  await page.goto(adminUrl("/bandeja?tipo=postulaciones"));
  await page.locator("tr", { hasText: name }).getByRole("link", { name }).click();
  await page.getByRole("button", { name: "Descartar" }).click();
  await expect(page.getByText("Marcado como descartado")).toBeVisible();
  await page.getByRole("button", { name: "Volver a nuevo" }).click();
  await expect(page.getByText("Marcado como nuevo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como contactado" })).toBeVisible();
});

test("un mensaje que no existe muestra «no encontrado»", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(adminUrl("/bandeja/0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11"));
  await expect(page.getByRole("heading", { name: "No encontramos lo que buscas" })).toBeVisible();
});

test.describe("en celular", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("la lista de tarjetas y el detalle se usan sin scroll horizontal", async ({ page }) => {
    const name = `E2E Bandeja Móvil ${randomInt(100000)}`;
    await sendApplication(page, name);
    await signInAsAdmin(page);
    await page.goto(adminUrl("/bandeja"));

    const card = page.locator("li[data-message]", { hasText: name }).first();
    await expect(card).toBeVisible();
    await expectNoHorizontalScroll(page);
    await card.getByRole("link").click();
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
    const button = page.getByRole("button", { name: "Marcar como contactado" });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
