import { render } from "@react-email/components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { inboxMessages } from "@/db/schema/inbox";
import { getLazyMailer, type Mailer } from "@/lib/mailer";
import { createRecordingMailer } from "@/test/auth";
import { createTestDb } from "@/test/db";
import { submitFighterApplication, submitSponsorship, type SubmitDeps } from "./service";

const NOW = new Date("2026-10-10T15:00:00Z");

const APPLICATION = {
  name: "Tomás Vera",
  email: "tomas@example.cl",
  phone: "+593 99 123 4567",
  birthDate: "1998-04-12",
  weightKg: "70,5",
  record: "5-1-0",
  gym: "Titán Gym",
  videoLinks: ["https://youtube.com/watch?v=abc", ""],
  message: "Quiero pelear en la próxima velada.",
  consent: "on",
};

const SPONSORSHIP = {
  company: "Kaizen Fightwear",
  contactName: "Ana Quiñónez",
  email: "ana@kaizen.example.cl",
  phone: "",
  message: "Queremos ser patrocinador oficial.",
  consent: "on",
};

describe("inbox service", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;
  let recorder: ReturnType<typeof createRecordingMailer>;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    recorder = createRecordingMailer();
  });

  afterEach(async () => {
    await testDb.close();
    vi.restoreAllMocks();
  });

  const deps = (overrides: Partial<SubmitDeps> = {}): SubmitDeps => ({ db, mailer: recorder, notifyEmail: "avisos@showbox.test", ipHash: "ip-1", now: NOW, ...overrides });

  const saved = () => db.select().from(inboxMessages);

  describe("submitFighterApplication", () => {
    it("saves the application with its data and the consent time, and notifies the promoter with the exact subject", async () => {
      const context = deps();

      const result = await submitFighterApplication(context, APPLICATION);

      expect(result).toEqual({ ok: true });
      const [row] = await saved();
      expect(row).toMatchObject({
        kind: "fighter_application",
        name: "Tomás Vera",
        email: "tomas@example.cl",
        phone: "+593 99 123 4567",
        status: "new",
        payload: { birthDate: "1998-04-12", weightKg: 70.5, record: "5-1-0", gym: "Titán Gym", videoLinks: ["https://youtube.com/watch?v=abc"], message: "Quiero pelear en la próxima velada." },
      });
      expect(row?.consentAt.toISOString()).toBe(NOW.toISOString());
      expect(recorder.sent).toHaveLength(1);
      expect(recorder.sent[0]).toMatchObject({ to: "avisos@showbox.test", subject: "[ShowBox Promotions] Nueva postulación: Tomás Vera" });
    });

    it("the notification email carries the data and a link to the inbox", async () => {
      const context = deps();
      await submitFighterApplication(context, APPLICATION);

      const html = await render(recorder.sent[0]!.react);
      expect(html).toContain("tomas@example.cl");
      expect(html).toContain("70,5 kg");
      expect(html).toContain("/bandeja/");
    });

    it("rejects the form without consent, with the exact message, and saves nothing", async () => {
      const context = deps();

      const result = await submitFighterApplication(context, { ...APPLICATION, consent: "" });

      expect(result).toEqual({ ok: false, errors: { consent: "Debes aceptar la política de privacidad" } });
      expect(await saved()).toEqual([]);
      expect(recorder.sent).toEqual([]);
    });

    it("answers ok but saves and sends nothing when the hidden trap field is filled", async () => {
      const context = deps();

      const result = await submitFighterApplication(context, { ...APPLICATION, website: "https://spam.example" });

      expect(result).toEqual({ ok: true });
      expect(await saved()).toEqual([]);
      expect(recorder.sent).toEqual([]);
    });

    it("refuses the 6th submission of the same address in an hour", async () => {
      const context = deps();
      for (let attempt = 0; attempt < 5; attempt += 1) expect(await submitFighterApplication(context, APPLICATION)).toEqual({ ok: true });

      const sixth = await submitFighterApplication(context, APPLICATION);

      expect(sixth).toEqual({ ok: false, errors: { form: "Demasiados envíos, intenta más tarde" } });
      expect(await saved()).toHaveLength(5);
      // Otra dirección sigue pudiendo enviar.
      expect(await submitFighterApplication(deps({ ipHash: "ip-2" }), APPLICATION)).toEqual({ ok: true });
    });

    it("a form with mistakes does not use up the allowance", async () => {
      const context = deps();
      for (let attempt = 0; attempt < 6; attempt += 1) await submitFighterApplication(context, { ...APPLICATION, email: "no-es-correo" });

      expect(await submitFighterApplication(context, APPLICATION)).toEqual({ ok: true });
    });

    it("keeps the application and answers ok when the email service fails, and logs the error", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const failing: Mailer = { send: async () => Promise.reject(new Error("Resend caído")) };

      const result = await submitFighterApplication(deps({ mailer: failing }), APPLICATION);

      expect(result).toEqual({ ok: true });
      expect(await saved()).toHaveLength(1);
      expect(error).toHaveBeenCalledOnce();
      expect(String(error.mock.calls[0]?.[0])).toMatch(/correo|email/i);
    });

    it("keeps the application and answers ok when the mail settings are incomplete (Resend without key)", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const result = await submitFighterApplication(deps({ mailer: getLazyMailer({ MAIL_DRIVER: "resend" }) }), APPLICATION);

      expect(result).toEqual({ ok: true });
      expect(await saved()).toHaveLength(1);
      expect(error).toHaveBeenCalledOnce();
    });

    it("keeps the application and answers ok when the panel address is missing in production", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ADMIN_URL", "");

      try {
        expect(await submitFighterApplication(deps(), APPLICATION)).toEqual({ ok: true });
      } finally {
        vi.unstubAllEnvs();
      }
      expect(await saved()).toHaveLength(1);
      expect(recorder.sent).toEqual([]);
      expect(error).toHaveBeenCalledOnce();
    });

    it("saves without sending anything when no notification address is configured", async () => {
      const context = deps({ notifyEmail: "" });

      expect(await submitFighterApplication(context, APPLICATION)).toEqual({ ok: true });
      expect(await saved()).toHaveLength(1);
      expect(recorder.sent).toEqual([]);
    });

    it.each([
      ["name", { name: "  " }, /nombre/i],
      ["email", { email: "no-es-correo" }, /correo/i],
      ["birthDate", { birthDate: "2999-01-01" }, /fecha de nacimiento/i],
      ["birthDate", { birthDate: "" }, /fecha de nacimiento/i],
      ["birthDate", { birthDate: "2000-13-01" }, /fecha de nacimiento/i],
      ["weightKg", { weightKg: "mucho" }, /peso/i],
      ["weightKg", { weightKg: "500" }, /peso/i],
      ["videoLinks", { videoLinks: ["javascript:alert(1)"] }, /enlace/i],
      ["phone", { phone: "llámame" }, /teléfono/i],
    ])("reports a mistake in %s next to its field", async (field, change, message) => {
      const result = await submitFighterApplication(deps(), { ...APPLICATION, ...change });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[field]).toMatch(message);
      expect(await saved()).toEqual([]);
    });

    it("accepts at most three video links", async () => {
      const links = ["https://a.example/1", "https://a.example/2", "https://a.example/3", "https://a.example/4"];

      const result = await submitFighterApplication(deps(), { ...APPLICATION, videoLinks: links });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.videoLinks).toMatch(/3/);
    });
  });

  describe("submitSponsorship", () => {
    it("saves the contact with the company as its name and notifies with the exact subject", async () => {
      const context = deps();

      expect(await submitSponsorship(context, SPONSORSHIP)).toEqual({ ok: true });

      const [row] = await saved();
      expect(row).toMatchObject({ kind: "sponsorship", name: "Kaizen Fightwear", email: "ana@kaizen.example.cl", phone: null, payload: { contactName: "Ana Quiñónez", message: "Queremos ser patrocinador oficial." } });
      expect(recorder.sent[0]).toMatchObject({ to: "avisos@showbox.test", subject: "[ShowBox Promotions] Contacto de patrocinio: Kaizen Fightwear" });
    });

    it("needs the company, a contact person and consent", async () => {
      const result = await submitSponsorship(deps(), { ...SPONSORSHIP, company: "", contactName: "", consent: "" });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["company", "consent", "contactName"]);
    });

    it("also ignores the trap field and the 6th submission", async () => {
      const context = deps();
      expect(await submitSponsorship(context, { ...SPONSORSHIP, website: "x" })).toEqual({ ok: true });
      expect(await saved()).toEqual([]);

      for (let attempt = 0; attempt < 5; attempt += 1) await submitSponsorship(context, SPONSORSHIP);
      expect(await submitSponsorship(context, SPONSORSHIP)).toEqual({ ok: false, errors: { form: "Demasiados envíos, intenta más tarde" } });
    });

    it("the two forms share the same allowance for an address", async () => {
      const context = deps();
      for (let attempt = 0; attempt < 3; attempt += 1) await submitSponsorship(context, SPONSORSHIP);
      for (let attempt = 0; attempt < 2; attempt += 1) await submitFighterApplication(context, APPLICATION);

      expect(await submitFighterApplication(context, APPLICATION)).toEqual({ ok: false, errors: { form: "Demasiados envíos, intenta más tarde" } });
    });
  });
});
