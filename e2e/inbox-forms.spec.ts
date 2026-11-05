import { randomInt } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { expect, test, type Page } from "@playwright/test";
import { db } from "@/db";
import { inboxMessages } from "@/db/schema/inbox";

// Cada prueba envía desde su propia «dirección» (el límite es de 5 envíos por hora por IP y todas las pruebas comparten la real).
const randomIp = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function fillSponsorship(page: Page, company: string) {
  await page.getByLabel("Empresa o marca").fill(company);
  await page.getByLabel("Persona de contacto").fill("Ana Quiñónez");
  await page.getByLabel("Correo").fill("ana@example.cl");
  await page.getByLabel("Acepto la política de privacidad").check();
}

async function fillApplication(page: Page, name: string) {
  await page.getByLabel("Nombre completo").fill(name);
  await page.getByLabel("Correo").fill("tomas@example.cl");
  await page.getByLabel("Fecha de nacimiento").fill("1998-04-12");
  await page.getByLabel("Peso (kg)").fill("70,5");
  await page.getByLabel("Acepto la política de privacidad").check();
}

const rowsNamed = async (name: string) => (await db.select({ total: count() }).from(inboxMessages).where(eq(inboxMessages.name, name)))[0]!.total;

test("«Patrocinar» envía el mensaje y muestra el aviso de enviado", async ({ page }) => {
  await page.goto("/patrocinar");
  await expect(page.getByRole("heading", { name: "Patrocinar", level: 1 })).toBeVisible();
  await fillSponsorship(page, "E2E Marca Envío");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(page.getByText("¡Gracias por escribirnos!")).toBeVisible();
  await expect(page.getByLabel("Empresa o marca")).toHaveCount(0);
  expect(await rowsNamed("E2E Marca Envío")).toBe(1);
});

test("«Quiero pelear» marca junto a cada campo lo que falta y conserva lo escrito", async ({ page }) => {
  await page.goto("/quiero-pelear");
  await expect(page.getByRole("heading", { name: "Quiero pelear", level: 1 })).toBeVisible();
  await page.getByLabel("Nombre completo").fill("Tomás Errores");
  await page.getByLabel("Correo").fill("no-es-correo");
  await page.getByLabel("Peso (kg)").fill("mucho");
  await page.getByRole("button", { name: "Enviar postulación" }).click();

  await expect(page.getByText("Escribe un correo válido, por ejemplo nombre@correo.cl")).toBeVisible();
  await expect(page.getByText("Escribe tu fecha de nacimiento")).toBeVisible();
  await expect(page.getByText("El peso debe ser un número")).toBeVisible();
  await expect(page.getByText("Debes aceptar la política de privacidad")).toBeVisible();
  // Lo escrito no se vacía.
  await expect(page.getByLabel("Nombre completo")).toHaveValue("Tomás Errores");
  await expect(page.getByLabel("Correo")).toHaveValue("no-es-correo");
  expect(await rowsNamed("Tomás Errores")).toBe(0);
});

test("«Quiero pelear» enviada con la política aceptada muestra el aviso de enviado", async ({ page }) => {
  await page.goto("/quiero-pelear");
  await fillApplication(page, "E2E Boxeador Envío");
  await page.getByLabel("Enlace de video 1").fill("https://youtube.com/watch?v=abc");
  await page.getByRole("button", { name: "Enviar postulación" }).click();

  await expect(page.getByText("¡Recibimos tu postulación!")).toBeVisible();
  expect(await rowsNamed("E2E Boxeador Envío")).toBe(1);
});

test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("el formulario se envía igual y se ve el aviso de enviado", async ({ page }) => {
    await page.goto("/patrocinar");
    await fillSponsorship(page, "E2E Marca Sin JS");
    await page.getByRole("button", { name: "Enviar mensaje" }).click();

    await expect(page.getByText("¡Gracias por escribirnos!")).toBeVisible();
    expect(await rowsNamed("E2E Marca Sin JS")).toBe(1);
  });

  test("y los errores salen junto al campo, sin perder lo escrito", async ({ page }) => {
    await page.goto("/patrocinar");
    await page.getByLabel("Empresa o marca").fill("E2E Marca Sin JS Errores");
    await page.getByRole("button", { name: "Enviar mensaje" }).click();

    await expect(page.getByText("Debes aceptar la política de privacidad")).toBeVisible();
    await expect(page.getByLabel("Empresa o marca")).toHaveValue("E2E Marca Sin JS Errores");
    expect(await rowsNamed("E2E Marca Sin JS Errores")).toBe(0);
  });
});

test("un bot que llena el campo trampa ve el aviso de enviado, pero no se guarda nada", async ({ page }) => {
  await page.goto("/patrocinar");
  await fillSponsorship(page, "E2E Marca Bot");
  await page.evaluate(() => {
    (document.getElementById("website") as HTMLInputElement).value = "https://spam.example";
  });
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(page.getByText("¡Gracias por escribirnos!")).toBeVisible();
  expect(await rowsNamed("E2E Marca Bot")).toBe(0);
});

test("el sexto envío de la misma dirección en una hora se rechaza con un aviso", async ({ page }) => {
  test.setTimeout(120_000);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await page.goto("/patrocinar");
    await fillSponsorship(page, `E2E Marca Límite ${attempt}`);
    await page.getByRole("button", { name: "Enviar mensaje" }).click();
    await expect(page.getByText("¡Gracias por escribirnos!")).toBeVisible();
  }

  await page.goto("/patrocinar");
  await fillSponsorship(page, "E2E Marca Límite 6");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(page.getByText("Demasiados envíos, intenta más tarde")).toBeVisible();
  await expect(page.getByLabel("Empresa o marca")).toHaveValue("E2E Marca Límite 6");
  expect(await rowsNamed("E2E Marca Límite 6")).toBe(0);
});

test.describe("en celular", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  for (const path of ["/quiero-pelear", "/patrocinar"]) {
    test(`${path} no tiene scroll horizontal y el botón es táctil`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
      const button = page.getByRole("button", { name: /^Enviar/ });
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });
  }
});
