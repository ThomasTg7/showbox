import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { daysFromNow, insertBout, insertEvent, insertSegment } from "@/features/events/test-helpers";
import { updateFighter } from "@/features/fighters/service";
import { createTestDb } from "@/test/db";
import { dismissSuggestion, saveRanking, setChampion } from "./service";
import { listSuggestions } from "./suggestions";
import { divisionIdBySlug, insertRankableFighter } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

type Division = "peso-superligero" | "peso-welter" | "peso-mediano" | "peso-pesado" | "peso-semipesado" | "peso-gallo" | "peso-supergallo";

/** Un evento con una pelea terminada (gana la roja) en la división. */
async function resultEvent(divisionId: string, winner: string, loser: string, options: { daysAhead?: number; level?: "pro" | "amateur"; status?: "completed" | "scheduled" } = {}) {
  const event = await insertEvent(db, { startsAt: daysFromNow(options.daysAhead ?? -5) });
  const segment = await insertSegment(db, event.id);
  await insertBout(db, {
    eventId: event.id,
    segmentId: segment,
    redFighterId: winner,
    blueFighterId: loser,
    divisionId,
    level: options.level ?? "pro",
    boutStatus: options.status ?? "completed",
    outcome: options.status === "scheduled" ? null : "red_win",
    method: options.status === "scheduled" ? null : "decision",
  });
  return event;
}

async function scenario(slug: Division) {
  const division = await divisionIdBySlug(db, slug);
  const [a, b, c] = [
    await insertRankableFighter(db, division, { firstName: "A", lastName: "Primero" }),
    await insertRankableFighter(db, division, { firstName: "B", lastName: "Segundo" }),
    await insertRankableFighter(db, division, { firstName: "C", lastName: "Tercero" }),
  ];
  const newcomer = await insertRankableFighter(db, division, { firstName: "N", lastName: "Nuevo" });
  await saveRanking(db, { level: "pro", divisionId: division }, [a, b, c], "admin-1");
  return { division, a, b, c, newcomer };
}

describe("listSuggestions", () => {
  it("suggests entering an unranked winner at the position of the ranked loser, with the event and a ready-made reason", async () => {
    const { division, c, newcomer } = await scenario("peso-superligero");
    const event = await resultEvent(division, newcomer, c);

    const suggestions = (await listSuggestions(db, "pro")).get(division);

    expect(suggestions).toEqual([
      {
        kind: "enter",
        fighterId: newcomer,
        toPosition: 3,
        reason: "Nuevo (sin ranking) venció a Tercero (#3)",
        fighterName: "N Nuevo",
        fighterNationality: "CL",
        eventId: event.id,
        eventName: expect.stringContaining("Evento de prueba"),
        scopeKey: `pro:${division}`,
      },
    ]);
  });

  it("suggests moving a ranked winner up", async () => {
    const { division, a, c } = await scenario("peso-welter");
    await resultEvent(division, c, a);
    const [suggestion] = (await listSuggestions(db, "pro")).get(division) ?? [];
    expect(suggestion).toMatchObject({ kind: "move", fighterId: c, toPosition: 1, reason: "Tercero (#3) venció a Primero (#1)" });
  });

  it("does not repeat a suggestion the admin already dismissed for that event", async () => {
    const { division, c, newcomer } = await scenario("peso-mediano");
    const event = await resultEvent(division, newcomer, c);
    expect((await listSuggestions(db, "pro")).get(division)).toHaveLength(1);

    await dismissSuggestion(db, event.id, newcomer, `pro:${division}`, "admin-1");

    expect((await listSuggestions(db, "pro")).get(division) ?? []).toEqual([]);
  });

  it("does not suggest anything once the ranking already reflects the result", async () => {
    const { division, a, b, c, newcomer } = await scenario("peso-pesado");
    await resultEvent(division, newcomer, c);
    await saveRanking(db, { level: "pro", divisionId: division }, [a, b, newcomer], "admin-1");
    expect((await listSuggestions(db, "pro")).get(division) ?? []).toEqual([]);
  });

  it("leaves beating the champion to the title change", async () => {
    const { division, newcomer } = await scenario("peso-semipesado");
    const champion = await insertRankableFighter(db, division);
    await setChampion(db, "pro", division, champion, "admin-1");
    await resultEvent(division, newcomer, champion);
    expect((await listSuggestions(db, "pro")).get(division) ?? []).toEqual([]);
  });

  it("only looks at the latest event with results of the division", async () => {
    const { division, b, c, newcomer } = await scenario("peso-gallo");
    await resultEvent(division, newcomer, b, { daysAhead: -30 });
    await resultEvent(division, c, b, { daysAhead: -10 });
    const suggestions = (await listSuggestions(db, "pro")).get(division) ?? [];
    expect(suggestions.map((suggestion) => suggestion.fighterId)).toEqual([c]);
  });

  it("ignores amateur results, unfinished fights and winners who are no longer active", async () => {
    const division = await divisionIdBySlug(db, "peso-mosca");
    const [ranked, other, retired] = [
      await insertRankableFighter(db, division),
      await insertRankableFighter(db, division),
      await insertRankableFighter(db, division, { firstName: "Rita", lastName: "Retirada" }),
    ];
    await saveRanking(db, { level: "pro", divisionId: division }, [ranked], "admin-1");
    await resultEvent(division, other, ranked, { level: "amateur" });
    await resultEvent(division, other, ranked, { status: "scheduled", daysAhead: 10 });
    await resultEvent(division, retired, ranked, { daysAhead: -2 });
    await updateFighter(db, retired, { firstName: "Rita", lastName: "Retirada", gender: "male", nationality: "CL", divisionId: division, careerStatus: "retired", proWins: 3 }, "admin-1");

    expect((await listSuggestions(db, "pro")).get(division) ?? []).toEqual([]);
  });

  it("can be limited to one division", async () => {
    const { division, c, newcomer } = await scenario("peso-supergallo");
    await resultEvent(division, newcomer, c);
    const only = await listSuggestions(db, "pro", division);
    expect([...only.keys()]).toEqual([division]);
  });
});
