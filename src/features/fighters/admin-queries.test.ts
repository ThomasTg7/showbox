import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { createTestDb } from "@/test/db";
import { getFighterForEdit, listAdminFighters } from "./admin-queries";
import { createFighter, deleteFighter, setFighterPublication } from "./service";
import { divisionIdBySlug, insertMedia, validFighterInput } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;
let ids: { matias: string; diego: string; camila: string; draft: string; trashed: string };
let bodyMediaId: string;

async function publish(id: string) {
  await setFighterPublication(db, id, { status: "published", publishAt: null }, "admin-1");
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  const ligero = await divisionIdBySlug(db, "peso-superligero");
  const paja = await divisionIdBySlug(db, "peso-mosca-femenino");
  bodyMediaId = await insertMedia(db, "fighter_body");
  const headshot = await insertMedia(db, "fighter_headshot");

  const matias = await createFighter(
    db,
    validFighterInput(ligero, { proWins: 12, proLosses: 2, weightKg: 70.3, bodyMediaId, headshotMediaId: headshot }),
    "admin-1",
  );
  const diego = await createFighter(
    db,
    validFighterInput(ligero, { firstName: "Jordan", lastName: "Quiñónez", nickname: "La Pantera", nationality: "AR", bodyMediaId }),
    "admin-1",
  );
  const camila = await createFighter(
    db,
    validFighterInput(paja, { firstName: "Mishel", lastName: "Caicedo", nickname: "La Reina", gender: "female" }),
    "admin-1",
  );
  const draft = await createFighter(db, validFighterInput(ligero, { firstName: "Borrador", lastName: "Oculto" }), "admin-1");
  const trashed = await createFighter(db, validFighterInput(ligero, { firstName: "Papelera", lastName: "Oculta" }), "admin-1");
  await Promise.all([matias.id, diego.id, camila.id, trashed.id].map(publish));
  await deleteFighter(db, trashed.id, "admin-1");
  ids = { matias: matias.id, diego: diego.id, camila: camila.id, draft: draft.id, trashed: trashed.id };
});
afterAll(() => close());

describe("listAdminFighters", () => {
  it("lists drafts too but not trashed fighters, paginated with hasMore", async () => {
    const all = await listAdminFighters(db, {});
    expect(all.items.map((fighter) => fighter.id)).toContain(ids.draft);
    expect(all.items.map((fighter) => fighter.id)).not.toContain(ids.trashed);
    expect(all.hasMore).toBe(false);

    const firstPage = await listAdminFighters(db, {}, { pageSize: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    const secondPage = await listAdminFighters(db, {}, { page: 2, pageSize: 2 });
    expect(secondPage.items.length).toBeGreaterThan(0);
    expect(secondPage.items.map((fighter) => fighter.id)).not.toContain(firstPage.items[0]?.id);
  });

  it("filters by publication status and searches like the public list", async () => {
    const drafts = await listAdminFighters(db, { publication: "draft" });
    expect(drafts.items.every((fighter) => fighter.status === "draft")).toBe(true);
    expect((await listAdminFighters(db, { q: "BORRADOR" })).items.map((fighter) => fighter.id)).toEqual([ids.draft]);
  });

  it("brings both photos of each row (the list falls back to the headshot without a body photo)", async () => {
    const { items } = await listAdminFighters(db, {});
    const matias = items.find((fighter) => fighter.id === ids.matias);
    expect(matias?.bodyMedia?.id).toBe(bodyMediaId);
    expect(matias?.headshotMedia?.kind).toBe("fighter_headshot");
    expect(items.find((fighter) => fighter.id === ids.diego)?.headshotMedia).toBeNull();
  });
});

describe("getFighterForEdit", () => {
  it("returns raw columns and both images, regardless of publication", async () => {
    const edit = await getFighterForEdit(db, ids.matias);
    expect(edit?.fighter.slug).toBe("bryan-cevallos");
    expect(edit?.bodyMedia?.id).toBe(bodyMediaId);
    expect(edit?.gallery).toEqual([]);
    expect(await getFighterForEdit(db, ids.draft)).not.toBeNull();
    expect(await getFighterForEdit(db, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

describe("getFighterForEdit gallery", () => {
  it("returns the gallery photos in order with the same media read", async () => {
    const [first, second] = [await insertMedia(db, "gallery"), await insertMedia(db, "gallery")];
    const ligero = await divisionIdBySlug(db, "peso-superligero");
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Con", lastName: "Galería", galleryMediaIds: [second, first] }), "admin-1");
    const edit = await getFighterForEdit(db, id);
    expect(edit?.gallery.map((photo) => photo.id)).toEqual([second, first]);
  });
});
