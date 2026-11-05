import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { fighterGallery, fighters } from "@/db/schema/fighters";
import { divisions } from "@/db/schema/divisions";
import { saveDivision, toggleDivision } from "@/features/divisions/service";
import { createTestDb } from "@/test/db";
import { createFighter, deleteFighter, setFighterPublication, updateFighter } from "./service";
import { divisionIdBySlug, insertMedia, validFighterInput } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;
let ligero: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  ligero = await divisionIdBySlug(db, "peso-superligero");
});
afterAll(() => close());

async function auditRows(entityId: string) {
  return db.select().from(auditLog).where(eq(auditLog.entityId, entityId));
}

describe("createFighter", () => {
  it("creates a draft with a slug from the name, a search text without accents, and an audit row", async () => {
    const { id, slug } = await createFighter(db, validFighterInput(ligero), "admin-1");
    expect(slug).toBe("bryan-cevallos");
    const [row] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(row).toMatchObject({ status: "draft", searchText: "bryan cevallos el martillo", divisionId: ligero });
    expect(await auditRows(id)).toHaveLength(1);
  });

  it("adds a numeric suffix when the slug is taken", async () => {
    const { slug } = await createFighter(db, validFighterInput(ligero), "admin-1");
    expect(slug).toBe("bryan-cevallos-2");
  });

  it("requires a division", async () => {
    await expect(createFighter(db, validFighterInput("", { divisionId: "" }), "admin-1")).rejects.toThrow("Selecciona una división");
  });

  it("rejects an image that does not exist or has the wrong kind", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    await expect(createFighter(db, validFighterInput(ligero, { bodyMediaId: missing }), "admin-1")).rejects.toThrow(
      "La imagen ya no está disponible. Súbela de nuevo.",
    );
    const gallery = await insertMedia(db, "gallery");
    await expect(createFighter(db, validFighterInput(ligero, { headshotMediaId: gallery }), "admin-1")).rejects.toThrow(
      "La imagen ya no está disponible. Súbela de nuevo.",
    );
  });

  it("stores valid images and turns empty image ids into null", async () => {
    const body = await insertMedia(db, "fighter_body");
    const { id } = await createFighter(
      db,
      validFighterInput(ligero, { firstName: "Ana", lastName: "Ruiz", bodyMediaId: body, headshotMediaId: "" }),
      "admin-1",
    );
    const [row] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(row).toMatchObject({ bodyMediaId: body, headshotMediaId: null });
  });

  it("validates the schedule: scheduling needs a date", async () => {
    await expect(createFighter(db, validFighterInput(ligero, { status: "scheduled" }), "admin-1")).rejects.toThrow("Elige fecha y hora");
  });

  it("limits the bio to 300 characters, since it shows inside the profile card", async () => {
    await expect(createFighter(db, validFighterInput(ligero, { firstName: "Bio", lastName: "Larga", bio: "x".repeat(301) }), "admin-1")).rejects.toThrow(
      "máx. 300 caracteres",
    );
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Bio", lastName: "Justa", bio: "x".repeat(300) }), "admin-1");
    const [row] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(row?.bio).toHaveLength(300);
  });

  it("keeps the manual record counters, defaulting to zero", async () => {
    const { id } = await createFighter(
      db,
      validFighterInput(ligero, { firstName: "Rec", lastName: "Ord", proWins: "12", proLosses: 2 }),
      "admin-1",
    );
    const [row] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(row).toMatchObject({ proWins: 12, proLosses: 2, proDraws: 0, amWins: 0 });
  });
});

describe("updateFighter", () => {
  it("keeps the published slug when the fighter is renamed, and refreshes the search text", async () => {
    const { id, slug } = await createFighter(db, validFighterInput(ligero, { firstName: "Luis", lastName: "Gómez", nickname: null }), "admin-1");
    await updateFighter(db, id, validFighterInput(ligero, { firstName: "Luis Alberto", lastName: "Gómez", nickname: "Rayo" }), "admin-1");
    const [row] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(row?.slug).toBe(slug);
    expect(row?.searchText).toBe("luis alberto gomez rayo");
  });

  it("changes the slug only when it is edited explicitly, and rejects one already in use", async () => {
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Pedro", lastName: "Quiñónez", nickname: null }), "admin-1");
    await updateFighter(db, id, validFighterInput(ligero, { firstName: "Pedro", lastName: "Quiñónez", slug: "pedro-quinonez-nuevo" }), "admin-1");
    const [row] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(row?.slug).toBe("pedro-quinonez-nuevo");
    await expect(updateFighter(db, id, validFighterInput(ligero, { slug: "bryan-cevallos" }), "admin-1")).rejects.toThrow(
      "Ese enlace ya lo usa otro boxeador",
    );
  });

  it("audits the change", async () => {
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Aud", lastName: "It" }), "admin-1");
    await updateFighter(db, id, validFighterInput(ligero, { firstName: "Aud", lastName: "It", gym: "Gym Norte" }), "admin-2");
    expect((await auditRows(id)).map((row) => row.action).sort()).toEqual(["create", "update"]);
  });

  it("fails with a clear message when the fighter no longer exists", async () => {
    await expect(updateFighter(db, "00000000-0000-4000-8000-000000000000", validFighterInput(ligero), "admin-1")).rejects.toThrow(
      "No se encontró al boxeador",
    );
  });
});

describe("setFighterPublication and deleteFighter", () => {
  it("publishes, schedules and audits the change as publish", async () => {
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Pub", lastName: "Lic" }), "admin-1");
    await setFighterPublication(db, id, { status: "published", publishAt: null }, "admin-1");
    const [published] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(published?.status).toBe("published");

    const at = new Date("2030-01-01T12:00:00Z");
    await setFighterPublication(db, id, { status: "scheduled", publishAt: at }, "admin-1");
    const [scheduled] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(scheduled).toMatchObject({ status: "scheduled", publishAt: at });
    expect((await auditRows(id)).filter((row) => row.action === "publish")).toHaveLength(2);
  });

  it("moves the fighter to the trash and audits it", async () => {
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Del", lastName: "Ete" }), "admin-1");
    await deleteFighter(db, id, "admin-1");
    const [row] = await db.select().from(fighters).where(eq(fighters.id, id));
    expect(row?.deletedAt).not.toBeNull();
    expect((await auditRows(id)).map((entry) => entry.action)).toContain("delete");
  });
});

describe("division guard", () => {
  it("does not let a division with active fighters be deactivated", async () => {
    await expect(toggleDivision(db, ligero, false, "admin-1")).rejects.toThrow("La división tiene boxeadores activos");
  });

  it("allows deactivating a division whose fighters are retired or trashed", async () => {
    const mosca = await divisionIdBySlug(db, "peso-mosca");
    await createFighter(db, validFighterInput(mosca, { firstName: "Ret", lastName: "Ired", careerStatus: "retired" }), "admin-1");
    const { id: trashed } = await createFighter(db, validFighterInput(mosca, { firstName: "Tra", lastName: "Shed" }), "admin-1");
    await deleteFighter(db, trashed, "admin-1");
    await expect(toggleDivision(db, mosca, false, "admin-1")).resolves.toBeUndefined();
  });

  it("does not let a division with fighters (even trashed) change gender, but allows other edits", async () => {
    const [division] = await db.select().from(divisions).where(eq(divisions.id, ligero));
    const edit = { id: ligero, name: division!.name, limitKg: division!.limitKg, rankingSlots: division!.rankingSlots };
    await expect(saveDivision(db, { ...edit, gender: "female" }, "admin-1")).rejects.toThrow(
      "La división tiene boxeadores: no se puede cambiar de categoría",
    );
    await expect(saveDivision(db, { ...edit, gender: "male", rankingSlots: 6 }, "admin-1")).resolves.toMatchObject({ rankingSlots: 6 });
  });

  it("moves an empty division to the end of its new gender", async () => {
    const female = await db.select({ sortOrder: divisions.sortOrder }).from(divisions).where(eq(divisions.gender, "female"));
    const lastFemale = Math.max(...female.map((row) => row.sortOrder));
    const empty = await saveDivision(db, { name: "Vacía", gender: "male", limitKg: 50, rankingSlots: 5 }, "admin-1");
    expect(empty.sortOrder).not.toBe(lastFemale + 1);
    const moved = await saveDivision(db, { id: empty.id, name: "Vacía", gender: "female", limitKg: 50, rankingSlots: 5 }, "admin-1");
    expect(moved.gender).toBe("female");
    expect(moved.sortOrder).toBe(lastFemale + 1);
  });
});

describe("fighter gallery", () => {
  const galleryOf = async (fighterId: string) =>
    (await db.select().from(fighterGallery).where(eq(fighterGallery.fighterId, fighterId)).orderBy(asc(fighterGallery.sortOrder))).map((row) => row.mediaId);

  it("stores the photos in the order they are sent, when creating and when editing", async () => {
    const [a, b, c] = [await insertMedia(db, "gallery"), await insertMedia(db, "gallery"), await insertMedia(db, "gallery")];
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Gal", lastName: "Eria", galleryMediaIds: [b, a] }), "admin-1");
    expect(await galleryOf(id)).toEqual([b, a]);

    await updateFighter(db, id, validFighterInput(ligero, { firstName: "Gal", lastName: "Eria", galleryMediaIds: [c, a, b] }), "admin-1");
    expect(await galleryOf(id)).toEqual([c, a, b]);
    await updateFighter(db, id, validFighterInput(ligero, { firstName: "Gal", lastName: "Eria", galleryMediaIds: [a] }), "admin-1");
    expect(await galleryOf(id)).toEqual([a]);
  });

  it("clears the gallery when the form sends no photos", async () => {
    const photo = await insertMedia(db, "gallery");
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Sin", lastName: "Fotos", galleryMediaIds: [photo] }), "admin-1");
    await updateFighter(db, id, validFighterInput(ligero, { firstName: "Sin", lastName: "Fotos" }), "admin-1");
    expect(await galleryOf(id)).toEqual([]);
  });

  it("does not repeat a photo, and rejects one that is missing or of another kind", async () => {
    const photo = await insertMedia(db, "gallery");
    const { id } = await createFighter(db, validFighterInput(ligero, { firstName: "Dup", lastName: "Foto", galleryMediaIds: [photo, photo] }), "admin-1");
    expect(await galleryOf(id)).toEqual([photo]);

    const body = await insertMedia(db, "fighter_body");
    await expect(updateFighter(db, id, validFighterInput(ligero, { firstName: "Dup", lastName: "Foto", galleryMediaIds: [body] }), "admin-1")).rejects.toThrow(
      "La imagen ya no está disponible",
    );
    await expect(
      updateFighter(db, id, validFighterInput(ligero, { firstName: "Dup", lastName: "Foto", galleryMediaIds: ["00000000-0000-4000-8000-000000000000"] }), "admin-1"),
    ).rejects.toThrow("La imagen ya no está disponible");
    expect(await galleryOf(id)).toEqual([photo]);
  });

  it("does not let a photo be removed from the storage while a gallery uses it", async () => {
    const photo = await insertMedia(db, "gallery");
    await createFighter(db, validFighterInput(ligero, { firstName: "Foto", lastName: "Usada", galleryMediaIds: [photo] }), "admin-1");
    const { media } = await import("@/db/schema/media");
    await expect(db.delete(media).where(eq(media.id, photo))).rejects.toThrow();
  });
});
