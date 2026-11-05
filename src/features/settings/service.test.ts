import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { media } from "@/db/schema/media";
import { siteSettings } from "@/db/schema/settings";
import type { PostBody } from "@/domain/post-body";
import { insertMedia } from "@/features/fighters/test-helpers";
import { purgeUnreferencedMedia } from "@/features/media/service";
import type { StorageDriver } from "@/lib/storage";
import { UserFacingError } from "@/lib/user-facing-error";
import { createTestDb } from "@/test/db";
import { getSetting } from "./queries";
import { saveSetting } from "./service";

const paragraph = (text: string): PostBody => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("saveSetting", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("rejects an invalid value with an error per field and stores nothing", async () => {
    const result = await saveSetting(db, "contact", { email: "no-es-email" }, "admin-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toMatch(/correo/i);
    expect(await db.select().from(siteSettings)).toEqual([]);
    expect(await db.select().from(auditLog)).toEqual([]);
  });

  it("saves, reads back what was saved and audits it", async () => {
    const result = await saveSetting(db, "contact", { email: " hola@showbox.test ", phone: "+593 99 123 4567", notifyEmail: "avisos@showbox.test" }, "admin-1");

    expect(result.ok).toBe(true);
    expect(await getSetting(db, "contact")).toEqual({ email: "hola@showbox.test", phone: "+593 99 123 4567", whatsapp: "", address: "", notifyEmail: "avisos@showbox.test" });
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.entityType, "settings"));
    expect(entry).toMatchObject({ actorId: "admin-1", action: "update", entityId: "contact" });
  });

  it("replaces the previous value instead of adding a second row", async () => {
    await saveSetting(db, "footer", { tagline: "Uno" }, "admin-1");
    await saveSetting(db, "footer", { tagline: "Dos" }, "admin-1");

    expect(await db.select().from(siteSettings)).toHaveLength(1);
    expect(await getSetting(db, "footer")).toEqual({ tagline: "Dos" });
  });

  it("accepts a social profile as a handle or a link and rejects anything else", async () => {
    expect((await saveSetting(db, "socials", { instagram: "@showboxpromotions", facebook: "https://facebook.com/showboxpromotions" }, "admin-1")).ok).toBe(true);

    const bad = await saveSetting(db, "socials", { instagram: "javascript:alert(1)" }, "admin-1");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.instagram).toBeDefined();
  });

  it("keeps the code of the Google verification tag when the whole tag is pasted", async () => {
    await saveSetting(db, "seo", { googleVerification: '<meta name="google-site-verification" content="abc123XYZ_-abc123XYZ" />' }, "admin-1");

    expect(await getSetting(db, "seo")).toEqual({ googleVerification: "abc123XYZ_-abc123XYZ" });
  });

  describe("ticketsFaq", () => {
    it("saves questions with their answers", async () => {
      await saveSetting(db, "ticketsFaq", { items: [{ q: " ¿Hay estacionamiento? ", a: "Sí." }] }, "admin-1");

      expect(await getSetting(db, "ticketsFaq")).toEqual({ items: [{ q: "¿Hay estacionamiento?", a: "Sí." }] });
    });

    it("rejects a question without an answer", async () => {
      const result = await saveSetting(db, "ticketsFaq", { items: [{ q: "¿Hay estacionamiento?", a: "" }] }, "admin-1");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.items).toMatch(/respuesta/i);
    });
  });

  describe("page texts", () => {
    it("saves a text without images or embeds", async () => {
      expect((await saveSetting(db, "about", { body: paragraph("Somos ShowBox") }, "admin-1")).ok).toBe(true);

      expect(await getSetting(db, "about")).toEqual({ body: paragraph("Somos ShowBox") });
    });

    it("rejects an image or an embed in the text", async () => {
      const withImage: PostBody = { type: "doc", content: [{ type: "image", attrs: { mediaId: "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11" } }] };
      const withEmbed: PostBody = { type: "doc", content: [{ type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } }] };

      for (const body of [withImage, withEmbed]) {
        const result = await saveSetting(db, "privacy", { body }, "admin-1");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.body).toBeDefined();
      }
    });

    it("stamps the privacy policy with the save date only when its text changes", async () => {
      await saveSetting(db, "privacy", { body: paragraph("Versión 1") }, "admin-1", new Date("2026-10-05T15:00:00Z"));
      const first = await getSetting(db, "privacy");
      await saveSetting(db, "privacy", { body: paragraph("Versión 1") }, "admin-1", new Date("2026-10-20T15:00:00Z"));
      const unchanged = await getSetting(db, "privacy");
      await saveSetting(db, "privacy", { body: paragraph("Versión 2") }, "admin-1", new Date("2026-11-02T15:00:00Z"));
      const changed = await getSetting(db, "privacy");

      expect(first.updatedAt).toBe("2026-10-05T15:00:00.000Z");
      expect(unchanged.updatedAt).toBe("2026-10-05T15:00:00.000Z");
      expect(changed.updatedAt).toBe("2026-11-02T15:00:00.000Z");
    });
  });

  describe("share image", () => {
    it("saves an og image and keeps it from being purged as unused", async () => {
      const ogMediaId = await insertMedia(db, "og_image", { createdAt: new Date("2026-01-01T00:00:00Z") });
      const unused = await insertMedia(db, "og_image", { createdAt: new Date("2026-01-01T00:00:00Z") });

      await saveSetting(db, "share", { ogMediaId }, "admin-1");
      const storage = { delete: async () => undefined } as unknown as StorageDriver;
      await purgeUnreferencedMedia(db, storage, new Date("2026-10-10T12:00:00Z"));

      expect((await db.select({ id: media.id }).from(media)).map((row) => row.id)).toEqual([ogMediaId]);
      expect(unused).not.toBe(ogMediaId);
    });

    it("rejects an image that is missing or is not an og image", async () => {
      const gallery = await insertMedia(db, "gallery");

      await expect(saveSetting(db, "share", { ogMediaId: gallery }, "admin-1")).rejects.toBeInstanceOf(UserFacingError);
      await expect(saveSetting(db, "share", { ogMediaId: "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11" }, "admin-1")).rejects.toBeInstanceOf(UserFacingError);
    });

    it("clears the image with an empty value", async () => {
      const ogMediaId = await insertMedia(db, "og_image");
      await saveSetting(db, "share", { ogMediaId }, "admin-1");

      await saveSetting(db, "share", { ogMediaId: "" }, "admin-1");

      expect(await getSetting(db, "share")).toEqual({ ogMediaId: null });
    });
  });
});
