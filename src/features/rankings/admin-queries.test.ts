import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { daysFromNow, insertBout, insertEvent, insertSegment } from "@/features/events/test-helpers";
import { updateFighter } from "@/features/fighters/service";
import { createTestDb } from "@/test/db";
import { getRankingEditorData, listScopeOverview, resolveScope, searchEligibleFighters } from "./admin-queries";
import { saveRanking, setChampion } from "./service";
import { divisionIdBySlug, insertRankableFighter } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;
let ligero: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  ligero = await divisionIdBySlug(db, "peso-superligero");
});
afterAll(() => close());

describe("resolveScope", () => {
  it("resolves P4P, a division by slug, and nothing for an unknown slug", async () => {
    expect(await resolveScope(db, "pro", "p4p")).toMatchObject({ divisionId: null, slug: "p4p", label: "Libra por libra", slots: 10, gender: null });
    expect(await resolveScope(db, "pro", "peso-superligero")).toMatchObject({ divisionId: ligero, label: "Peso Superligero", slots: 5, gender: "male" });
    expect(await resolveScope(db, "pro", "peso-inexistente")).toBeNull();
  });
});

describe("getRankingEditorData", () => {
  it("returns the saved ranking in order, the champion, and flags who the site no longer shows", async () => {
    const division = await divisionIdBySlug(db, "peso-welter");
    const [champion, a, b] = [
      await insertRankableFighter(db, division, { firstName: "Cam", lastName: "Peon" }),
      await insertRankableFighter(db, division, { firstName: "Ana", lastName: "Alta" }),
      await insertRankableFighter(db, division, { firstName: "Beto", lastName: "Baja" }),
    ];
    await setChampion(db, "pro", division, champion, "admin-1");
    await saveRanking(db, { level: "pro", divisionId: division }, [a, b], "admin-1");
    await updateFighter(db, b, { firstName: "Beto", lastName: "Baja", gender: "male", nationality: "CL", divisionId: division, careerStatus: "retired", proWins: 3 }, "admin-1");

    const scope = (await resolveScope(db, "pro", "peso-welter"))!;
    const data = await getRankingEditorData(db, scope);

    expect(data.champion?.name).toBe("Cam Peon");
    expect(data.entries.map((entry) => [entry.name, entry.hiddenNote])).toEqual([
      ["Ana Alta", null],
      ["Beto Baja", "Retirado"],
    ]);
    expect(data.updatedAt).toEqual(expect.any(String));
  });

  it("is empty before the first version", async () => {
    const scope = (await resolveScope(db, "amateur", "peso-gallo"))!;
    expect(await getRankingEditorData(db, scope)).toMatchObject({ champion: null, entries: [], updatedAt: null });
  });
});

describe("listScopeOverview", () => {
  it("lists P4P first and then each active division with champion, entries and pending suggestions", async () => {
    const division = await divisionIdBySlug(db, "peso-mediano");
    const [champion, ranked, winner] = [
      await insertRankableFighter(db, division),
      await insertRankableFighter(db, division),
      await insertRankableFighter(db, division),
    ];
    await setChampion(db, "pro", division, champion, "admin-1");
    await saveRanking(db, { level: "pro", divisionId: division }, [ranked], "admin-1");
    const event = await insertEvent(db, { startsAt: daysFromNow(-3) });
    await insertBout(db, {
      eventId: event.id,
      segmentId: await insertSegment(db, event.id),
      redFighterId: winner,
      blueFighterId: ranked,
      divisionId: division,
      boutStatus: "completed",
      outcome: "red_win",
      method: "decision",
    });

    const overview = await listScopeOverview(db, "pro");

    expect(overview[0]).toMatchObject({ scope: { slug: "p4p" }, championName: undefined, entryCount: 0, suggestionCount: 0 });
    const medio = overview.find((row) => row.scope.divisionId === division);
    expect(medio).toMatchObject({ entryCount: 1, suggestionCount: 1 });
    expect(medio?.championName).toEqual(expect.any(String));
    expect(overview).toHaveLength(26);
  });
});

describe("searchEligibleFighters", () => {
  it("finds only fighters who can enter the ranking, by name without accents", async () => {
    const division = await divisionIdBySlug(db, "peso-pesado");
    await insertRankableFighter(db, division, { firstName: "Andrés", lastName: "Búsqueda" });
    await insertRankableFighter(db, division, { firstName: "Andrés", lastName: "Retirado", careerStatus: "retired" });
    await insertRankableFighter(db, await divisionIdBySlug(db, "peso-mosca-femenino"), { firstName: "Andrea", lastName: "Mujer", gender: "female" });

    const found = await searchEligibleFighters(db, { level: "pro", divisionId: division, gender: "male" }, "andres");

    expect(found.map((fighter) => fighter.name)).toEqual(["Andrés Búsqueda"]);
  });

  it("limits the results to ten", async () => {
    const division = await divisionIdBySlug(db, "peso-semipesado");
    for (let index = 0; index < 12; index += 1) await insertRankableFighter(db, division, { firstName: "Lote", lastName: `Numero${index}` });
    const found = await searchEligibleFighters(db, { level: "pro", divisionId: division, gender: "male" }, "lote");
    expect(found).toHaveLength(10);
  });

  it("searches P4P across genders", async () => {
    const paja = await divisionIdBySlug(db, "peso-mosca-femenino");
    await insertRankableFighter(db, paja, { firstName: "Zoila", lastName: "Boxeadora", gender: "female" });
    const found = await searchEligibleFighters(db, { level: "pro", divisionId: null, gender: null }, "zoila");
    expect(found.map((fighter) => fighter.name)).toEqual(["Zoila Boxeadora"]);
  });
});
