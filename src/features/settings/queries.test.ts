import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { siteSettings } from "@/db/schema/settings";
import { EMPTY_POST_BODY } from "@/domain/post-body";
import { createTestDb } from "@/test/db";
import { getAllSettings, getSetting } from "./queries";

describe("settings queries", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("returns empty defaults when the setting was never saved", async () => {
    expect(await getSetting(db, "socials")).toEqual({ instagram: "", tiktok: "", youtube: "", facebook: "", x: "" });
    expect(await getSetting(db, "ticketsFaq")).toEqual({ items: [] });
    expect(await getSetting(db, "about")).toEqual({ body: EMPTY_POST_BODY });
    expect(await getSetting(db, "share")).toEqual({ ogMediaId: null });
    expect(await getSetting(db, "privacy")).toEqual({ body: EMPTY_POST_BODY, updatedAt: null });
  });

  it("returns what was saved, filling in fields it does not have", async () => {
    await db.insert(siteSettings).values({ key: "socials", value: { instagram: "@openfightlatam" } });

    expect(await getSetting(db, "socials")).toEqual({ instagram: "@openfightlatam", tiktok: "", youtube: "", facebook: "", x: "" });
  });

  it("falls back to the defaults when the stored value is no longer valid", async () => {
    await db.insert(siteSettings).values({ key: "contact", value: { email: 42, phone: { nope: true } } });

    expect(await getSetting(db, "contact")).toEqual({ email: "", phone: "", whatsapp: "", address: "", notifyEmail: "" });
  });

  it("reads every setting in one query, defaults included", async () => {
    await db.insert(siteSettings).values([
      { key: "footer", value: { tagline: "MMA chileno" } },
      { key: "seo", value: { googleVerification: "abc123XYZ_-abc123XYZ" } },
    ]);

    const all = await getAllSettings(db);

    expect(all.footer).toEqual({ tagline: "MMA chileno" });
    expect(all.seo).toEqual({ googleVerification: "abc123XYZ_-abc123XYZ" });
    expect(all.contact.email).toBe("");
    expect(Object.keys(all).sort()).toEqual(["about", "contact", "footer", "privacy", "seo", "share", "socials", "ticketsFaq"]);
  });
});
