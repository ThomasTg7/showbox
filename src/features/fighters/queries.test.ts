import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as mediaQueries from "@/features/media/queries";
import { createTestDb } from "@/test/db";
import { getPublicFighterBySlug, getPublicFighterRef, listPublicFighterCardsByIds, listPublicFighters, listPublicFilterOptions } from "./queries";
import type { FighterFilters } from "./schema";
import { createFighter, deleteFighter, setFighterPublication } from "./service";
import { divisionIdBySlug, insertMedia, validFighterInput } from "./test-helpers";

vi.mock("@/features/media/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/media/queries")>();
  return { ...actual, getMediaByIds: vi.fn(actual.getMediaByIds) };
});

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

async function listItems(filters: FighterFilters, options?: { preview?: boolean }) {
  return (await listPublicFighters(db, filters, options)).items;
}

const names = (list: { firstName: string }[]) => list.map((fighter) => fighter.firstName).sort();

describe("listPublicFighters", () => {
  it("finds a fighter ignoring accents and case, by last name or nickname", async () => {
    expect(names(await listItems({ q: "cevallos" }))).toEqual(["Bryan"]);
    expect(names(await listItems({ q: "QUIÑONEZ" }))).toEqual(["Jordan"]);
    expect(names(await listItems({ q: "MARTILLO" }))).toEqual(["Bryan"]);
    expect(names(await listItems({ q: "reina" }))).toEqual(["Mishel"]);
    expect(names(await listItems({ q: "bryan martillo" }))).toEqual(["Bryan"]);
  });

  it("treats LIKE wildcards in the search as plain text", async () => {
    expect(await listItems({ q: "%" })).toEqual([]);
    expect(await listItems({ q: "_" })).toEqual([]);
  });

  it("never lists drafts or trashed fighters", async () => {
    expect(names(await listItems({}))).toEqual(["Bryan", "Jordan", "Mishel"]);
  });

  it("combines division and nationality filters with AND", async () => {
    expect(names(await listItems({ division: "peso-superligero" }))).toEqual(["Bryan", "Jordan"]);
    expect(names(await listItems({ division: "peso-superligero", nationality: "AR" }))).toEqual(["Jordan"]);
    expect(await listItems({ division: "peso-mosca-femenino", nationality: "AR" })).toEqual([]);
  });

  it("filters by gender and career status", async () => {
    expect(names(await listItems({ gender: "female" }))).toEqual(["Mishel"]);
    expect(await listItems({ status: "retired" })).toEqual([]);
    expect(await listItems({ status: "active" })).toHaveLength(3);
  });

  it("returns card data with the division and the pro manual record", async () => {
    const [matias] = await listItems({ q: "bryan" });
    expect(matias).toMatchObject({
      slug: "bryan-cevallos",
      nickname: "El Martillo",
      nationality: "CL",
      division: { name: "Superligero", slug: "peso-superligero", limitKg: 63.5 },
      record: { wins: 12, losses: 2, draws: 0 },
    });
  });

  it("loads the photos of the whole page with a single media query", async () => {
    vi.mocked(mediaQueries.getMediaByIds).mockClear();
    const list = await listItems({});
    expect(mediaQueries.getMediaByIds).toHaveBeenCalledTimes(1);
    expect(list.find((fighter) => fighter.firstName === "Bryan")?.bodyMedia?.id).toBe(bodyMediaId);
    expect(list.find((fighter) => fighter.firstName === "Jordan")?.bodyMedia?.id).toBe(bodyMediaId);
    expect(list.find((fighter) => fighter.firstName === "Mishel")?.bodyMedia).toBeNull();
  });

  it("brings the headshot too, so a card without a body photo can fall back to it", async () => {
    const list = await listItems({});
    expect(list.find((fighter) => fighter.firstName === "Bryan")?.headshotMedia?.kind).toBe("fighter_headshot");
    expect(list.find((fighter) => fighter.firstName === "Jordan")?.headshotMedia).toBeNull();
  });
});

describe("listPublicFighterCardsByIds", () => {
  it("returns the cards in the order requested, whatever the order of the table", async () => {
    const cards = await listPublicFighterCardsByIds(db, [ids.camila, ids.matias, ids.diego]);

    expect(cards.map((card) => card.firstName)).toEqual(["Mishel", "Bryan", "Jordan"]);
    expect(cards[1]).toMatchObject({ slug: "bryan-cevallos", division: { name: "Superligero" }, record: { wins: 12, losses: 2 } });
  });

  it("only returns fighters that are public: no drafts, no trash, and ids that do not exist are skipped", async () => {
    const cards = await listPublicFighterCardsByIds(db, [ids.draft, ids.matias, ids.trashed, "0b6f0c40-7d4c-4f3a-9d0a-5f1d2b8f6a11"]);

    expect(cards.map((card) => card.firstName)).toEqual(["Bryan"]);
  });

  it("repeated ids come back once, and no ids is an empty list without touching the database", async () => {
    expect((await listPublicFighterCardsByIds(db, [ids.matias, ids.matias])).map((card) => card.firstName)).toEqual(["Bryan"]);
    expect(await listPublicFighterCardsByIds(db, [])).toEqual([]);
  });

  it("loads every photo with a single media query, never one per fighter", async () => {
    vi.mocked(mediaQueries.getMediaByIds).mockClear();
    const cards = await listPublicFighterCardsByIds(db, [ids.matias, ids.diego, ids.camila]);
    expect(mediaQueries.getMediaByIds).toHaveBeenCalledTimes(1);
    expect(cards[0]?.bodyMedia?.id).toBe(bodyMediaId);
    expect(cards[0]?.headshotMedia?.kind).toBe("fighter_headshot");
  });
});

describe("getPublicFighterBySlug", () => {
  it("returns the full profile with both photos", async () => {
    const profile = await getPublicFighterBySlug(db, "bryan-cevallos");
    expect(profile).toMatchObject({ firstName: "Bryan", weightKg: 70.3, proRecord: { wins: 12, losses: 2, draws: 0, noContests: 0 } });
    expect(profile?.bodyMedia?.id).toBe(bodyMediaId);
    expect(profile?.headshotMedia).not.toBeNull();
  });

  it("returns null for drafts, trashed fighters and unknown slugs", async () => {
    expect(await getPublicFighterBySlug(db, "borrador-oculto")).toBeNull();
    expect(await getPublicFighterBySlug(db, "papelera-oculta")).toBeNull();
    expect(await getPublicFighterBySlug(db, "no-existe")).toBeNull();
  });

  it("returns a draft when previewing", async () => {
    expect((await getPublicFighterBySlug(db, "borrador-oculto", { preview: true }))?.firstName).toBe("Borrador");
  });

  it("hides a scheduled fighter until its date", async () => {
    const ligero = await divisionIdBySlug(db, "peso-superligero");
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Futuro", lastName: "Estrella" }), "admin-1");
    await setFighterPublication(db, id, { status: "scheduled", publishAt: new Date(Date.now() + 86_400_000) }, "admin-1");
    expect(await getPublicFighterBySlug(db, "futuro-estrella")).toBeNull();
    await setFighterPublication(db, id, { status: "scheduled", publishAt: new Date(Date.now() - 1000) }, "admin-1");
    expect((await getPublicFighterBySlug(db, "futuro-estrella"))?.firstName).toBe("Futuro");
  });
});

describe("public profile gallery", () => {
  it("carries the gallery in order, and an empty list when there are none", async () => {
    expect((await getPublicFighterBySlug(db, "bryan-cevallos"))?.gallery).toEqual([]);

    const [first, second] = [await insertMedia(db, "gallery"), await insertMedia(db, "gallery")];
    const ligero = await divisionIdBySlug(db, "peso-superligero");
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Con", lastName: "Fotos", galleryMediaIds: [second, first] }), "admin-1");
    await publish(id);
    expect((await getPublicFighterBySlug(db, "con-fotos"))?.gallery.map((photo) => photo.id)).toEqual([second, first]);
  });
});

describe("listPublicFilterOptions", () => {
  it("offers only the divisions and countries that have published fighters", async () => {
    const options = await listPublicFilterOptions(db);
    expect(options.divisions.map((division) => division.slug)).toEqual(["peso-superligero", "peso-mosca-femenino"]);
    expect(options.nationalities).toEqual(["AR", "CL"]);
  });
});

describe("getPublicFighterRef", () => {
  it("returns the id and image ids of a published fighter, and null for hidden ones", async () => {
    const ref = await getPublicFighterRef(db, "bryan-cevallos");
    expect(ref).toMatchObject({ id: ids.matias, bodyMediaId });
    expect(ref?.headshotMediaId).not.toBeNull();
    expect(await getPublicFighterRef(db, "borrador-oculto")).toBeNull();
    expect(await getPublicFighterRef(db, "papelera-oculta")).toBeNull();
  });
});
