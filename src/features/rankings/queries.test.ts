import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { bouts } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { rankingEntries, rankingVersions } from "@/db/schema/rankings";
import { eventIdBySlug, fighterIdBySlug, insertBout, insertEvent, insertSegment } from "@/features/events/test-helpers";
import { updateFighter } from "@/features/fighters/service";
import { insertMedia } from "@/features/fighters/test-helpers";
import { createTestDb } from "@/test/db";
import { getChampionBadges } from "./champion-badges";
import { getBoutRankLabels, getFighterRankingTags, getPublicRankings } from "./queries";
import { seedRankings } from "./seed";
import { saveRanking, setChampion, setRankingVisibility } from "./service";
import { divisionIdBySlug, insertRankableFighter, showRankingLevels } from "./test-helpers";

describe("rankings of the seed", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    await seedRankings(db);
  });
  afterAll(() => close());

  it("shows P4P first, then each division with its champion and numbered fighters", async () => {
    const page = await getPublicRankings(db, "pro");
    expect(page.cards.map((card) => card.division?.slug ?? "p4p")).toEqual(["p4p", "peso-supergallo", "peso-superligero", "peso-welter", "peso-mosca-femenino"]);
    const ligero = page.cards.find((card) => card.division?.slug === "peso-superligero");
    expect(ligero?.champion?.name).toBe("Bryan Cevallos");
    expect(ligero?.entries.map((entry) => [entry.position, entry.fighter.name])).toEqual([
      [1, "Jordan Quiñónez"],
      [2, "Kevin Andrango"],
    ]);
    expect(ligero?.updatedAt).toEqual(expect.any(String));
  });

  it("gives the champion both photos (a headshot-only champion still has a picture); numbered rows carry none", async () => {
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const headshotId = await insertMedia(db, "fighter_headshot");
    await db.update(fighters).set({ headshotMediaId: headshotId, bodyMediaId: null }).where(eq(fighters.id, cevallos));
    const ligero = (await getPublicRankings(db, "pro")).cards.find((card) => card.division?.slug === "peso-superligero");
    expect(ligero?.champion?.bodyMedia).toBeNull();
    expect(ligero?.champion?.headshotMedia?.id).toBe(headshotId);
    expect(ligero?.entries.every((entry) => entry.fighter.headshotMedia === null && entry.fighter.bodyMedia === null)).toBe(true);
  });

  it("keeps the first version of every scope as all NEW", async () => {
    const page = await getPublicRankings(db, "pro");
    const ligero = page.cards.find((card) => card.division?.slug === "peso-superligero");
    expect(ligero?.entries.map((entry) => entry.movement)).toEqual([{ kind: "new" }, { kind: "new" }]);
  });

  it("keeps pro and amateur rankings apart", async () => {
    const amateur = await getPublicRankings(db, "amateur");
    expect(amateur.cards).toHaveLength(1);
    expect(amateur.cards[0]?.division?.slug).toBe("peso-mosca-femenino");
    expect(amateur.cards[0]?.champion?.name).toBe("Daniela Pazmiño");
  });

  it("gives the three expected tags to a fighter who is amateur champion, ranked in the division and in P4P", async () => {
    const cortes = await fighterIdBySlug(db, "daniela-pazmino");
    expect(await getFighterRankingTags(db, cortes)).toEqual([
      { label: "Campeona amateur · Peso Mosca fem.", isTitle: true },
      { label: "#1 Peso Mosca fem.", isTitle: false },
      { label: "#5 P4P", isTitle: false },
    ]);
  });

  it("tags a champion and a P4P leader", async () => {
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    expect(await getFighterRankingTags(db, cevallos)).toEqual([
      { label: "Campeón pro · Peso Superligero", isTitle: true },
      { label: "#1 P4P", isTitle: false },
    ]);
  });

  it("tags only the division for a ranked fighter and nothing for a retired one", async () => {
    expect(await getFighterRankingTags(db, await fighterIdBySlug(db, "andres-tapia"))).toEqual([{ label: "#2 Peso Wélter", isTitle: false }]);
    expect(await getFighterRankingTags(db, await fighterIdBySlug(db, "patricio-ortiz"))).toEqual([]);
  });

  it("labels the fighters of a card as C or #n, and skips catchweight bouts", async () => {
    const eventId = await eventIdBySlug(db, "showbox-fight-night-5");
    const rows = await db.select({ id: bouts.id, red: bouts.redFighterId, blue: bouts.blueFighterId, catchweightKg: bouts.catchweightKg }).from(bouts).where(eq(bouts.eventId, eventId));
    const labels = await getBoutRankLabels(db, rows.map((row) => row.id));
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
    expect(labels.get(cevallos)).toBe("C");
    expect(labels.get(quinonez)).toBe("#1");
    const catchweight = rows.find((row) => row.catchweightKg !== null)!;
    expect(labels.has(catchweight.red)).toBe(false);
    expect(labels.has(catchweight.blue)).toBe(false);
  });

  it("badges each visible champion for the fighter list, «Campeona» for women and pro before amateur", async () => {
    const badges = await getChampionBadges(db);
    expect(badges[await fighterIdBySlug(db, "bryan-cevallos")]).toBe("Campeón");
    expect(badges[await fighterIdBySlug(db, "mishel-caicedo")]).toBe("Campeona");
    expect(badges[await fighterIdBySlug(db, "daniela-pazmino")]).toBe("Campeona amateur");
    expect(badges[await fighterIdBySlug(db, "jordan-quinonez")]).toBeUndefined();
  });

  it("hiding a level hides its ranked positions but keeps its champions in view everywhere", async () => {
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const quinonez = await fighterIdBySlug(db, "jordan-quinonez");
    const eventId = await eventIdBySlug(db, "showbox-fight-night-5");
    const boutIds = (await db.select({ id: bouts.id }).from(bouts).where(eq(bouts.eventId, eventId))).map((row) => row.id);

    await setRankingVisibility(db, "pro", false, "admin-1");
    const { cards } = await getPublicRankings(db, "pro");
    // Solo la tarjeta del campeón de cada división: sin puestos ni libra por libra.
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((card) => card.champion !== null && card.entries.length === 0 && card.division !== null)).toBe(true);
    expect(cards.some((card) => card.champion?.name === "Bryan Cevallos")).toBe(true);
    expect(await getFighterRankingTags(db, cevallos)).toEqual([{ label: "Campeón pro · Peso Superligero", isTitle: true }]);
    const labels = await getBoutRankLabels(db, boutIds);
    expect(labels.get(cevallos)).toBe("C");
    expect(labels.has(quinonez)).toBe(false);
    expect((await getChampionBadges(db))[cevallos]).toBe("Campeón");
    // El amateur sigue completo a la vista.
    expect((await getPublicRankings(db, "amateur")).cards).toHaveLength(1);

    await setRankingVisibility(db, "pro", true, "admin-1");
    expect((await getBoutRankLabels(db, boutIds)).get(quinonez)).toBe("#1");
  });

  it("returns no labels without bouts", async () => {
    expect((await getBoutRankLabels(db, [])).size).toBe(0);
  });
});

describe("movement and visibility", () => {
  let db: Db;
  let close: () => Promise<void>;
  let division: string;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    await showRankingLevels(db);
    division = await divisionIdBySlug(db, "peso-superligero");
  });
  afterAll(() => close());

  it("computes ▲▼ and NUEVO against the previous version", async () => {
    const [a, b, c] = [await insertRankableFighter(db, division), await insertRankableFighter(db, division), await insertRankableFighter(db, division)];
    await saveRanking(db, { level: "pro", divisionId: division }, [a, b], "admin-1");
    await saveRanking(db, { level: "pro", divisionId: division }, [b, a, c], "admin-1");

    const card = (await getPublicRankings(db, "pro")).cards.find((candidate) => candidate.division?.id === division);
    expect(card?.entries.map((entry) => [entry.fighter.id, entry.movement])).toEqual([
      [b, { kind: "up", by: 1 }],
      [a, { kind: "down", by: 1 }],
      [c, { kind: "new" }],
    ]);
  });

  it("never shows the champion in the numbered list, even if an old version has them", async () => {
    const [champ, other] = [await insertRankableFighter(db, division), await insertRankableFighter(db, division)];
    await saveRanking(db, { level: "pro", divisionId: division }, [other], "admin-1");
    // Una versión escrita a mano (como la de un sistema anterior) con el campeón dentro.
    await setChampion(db, "pro", division, champ, "admin-1");
    const [version] = await db.insert(rankingVersions).values({ level: "pro", divisionId: division, createdBy: "x" }).returning({ id: rankingVersions.id });
    await db.insert(rankingEntries).values([
      { versionId: version!.id, position: 1, fighterId: champ },
      { versionId: version!.id, position: 2, fighterId: other },
    ]);

    const card = (await getPublicRankings(db, "pro")).cards.find((candidate) => candidate.division?.id === division);
    expect(card?.champion?.id).toBe(champ);
    expect(card?.entries.map((entry) => entry.fighter.id)).toEqual([other]);
    expect(card?.entries[0]?.position).toBe(1);
  });

  it("shows a vacant title as no champion once the champion is no longer active", async () => {
    const solo = await divisionIdBySlug(db, "peso-mediano");
    const champ = await insertRankableFighter(db, solo);
    await setChampion(db, "pro", solo, champ, "admin-1");
    await updateFighter(db, champ, { firstName: "A", lastName: "B", gender: "male", nationality: "CL", divisionId: solo, careerStatus: "retired", proWins: 3 }, "admin-1");

    const page = await getPublicRankings(db, "pro");
    expect(page.cards.find((card) => card.division?.id === solo)).toBeUndefined();
  });

  it("numbers the site, the fighter tags and the card the same way when someone above stops being visible", async () => {
    const welter = await divisionIdBySlug(db, "peso-welter");
    const [gone, champ, stays] = [
      await insertRankableFighter(db, welter, { firstName: "Ido", lastName: "Retirado" }),
      await insertRankableFighter(db, welter),
      await insertRankableFighter(db, welter, { firstName: "Sube", lastName: "Solo" }),
    ];
    await saveRanking(db, { level: "pro", divisionId: welter }, [gone, champ, stays], "admin-1");
    // El #2 se corona (sale del ranking numerado) y el #1 se retira: «Sube Solo» se ve como #1 en todas partes.
    await setChampion(db, "pro", welter, champ, "admin-1");
    await updateFighter(db, gone, { firstName: "Ido", lastName: "Retirado", gender: "male", nationality: "CL", divisionId: welter, careerStatus: "retired", proWins: 3 }, "admin-1");

    const card = (await getPublicRankings(db, "pro")).cards.find((candidate) => candidate.division?.id === welter);
    expect(card?.entries.map((entry) => [entry.position, entry.fighter.id])).toEqual([[1, stays]]);
    expect(await getFighterRankingTags(db, stays)).toEqual([{ label: "#1 Peso Wélter", isTitle: false }]);

    const event = await insertEvent(db);
    const segmentId = await insertSegment(db, event.id);
    const boutId = await insertBout(db, { eventId: event.id, segmentId, redFighterId: champ, blueFighterId: stays, divisionId: welter });
    const labels = await getBoutRankLabels(db, [boutId]);
    expect(Object.fromEntries(labels)).toEqual({ [champ]: "C", [stays]: "#1" });
  });

  it("drops the tags and labels of an inactive division", async () => {
    const mosca = await divisionIdBySlug(db, "peso-mosca");
    const [champ, ranked] = [await insertRankableFighter(db, mosca), await insertRankableFighter(db, mosca)];
    await setChampion(db, "pro", mosca, champ, "admin-1");
    await saveRanking(db, { level: "pro", divisionId: mosca }, [ranked], "admin-1");
    await db.update(divisions).set({ active: false }).where(eq(divisions.id, mosca));

    expect(await getFighterRankingTags(db, champ)).toEqual([]);
    expect(await getFighterRankingTags(db, ranked)).toEqual([]);
  });

  it("omits a division with neither champion nor ranking", async () => {
    const page = await getPublicRankings(db, "amateur");
    expect(page.cards).toEqual([]);
  });
});
