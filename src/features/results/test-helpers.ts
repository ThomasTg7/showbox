import type { AdminBout, AdminBoutFighter } from "@/features/events/admin-card-queries";
import type { SavedResult } from "./result-draft";

const fighter = (id: string, lastName: string): AdminBoutFighter => ({ id, firstName: "Boxeador", lastName, nickname: null, nationality: "CL", headshotMedia: null, bodyMedia: null });

/** Una pelea programada (Cevallos vs Quiñónez, 3 × 5 min) como la entrega el panel; `overrides` pisa lo que haga falta. */
export function adminBout(overrides: Partial<AdminBout> = {}): AdminBout {
  return {
    id: "bout-1",
    segmentId: "segment-1",
    level: "pro",
    scheduledRounds: 3,
    roundSeconds: 300,
    isTitleFight: false,
    championCorner: "red",
    status: "scheduled",
    cancelReason: null,
    divisionId: null,
    divisionName: "Ligero",
    divisionGender: "male",
    catchweightKg: null,
    red: fighter("red-1", "Cevallos"),
    blue: fighter("blue-1", "Quiñónez"),
    result: null,
    resultLine: null,
    ...overrides,
  };
}

/** Una victoria de la roja por decisión unánime (la que ya tiene una pelea terminada). */
export const decisionResult: SavedResult = {
  outcome: "red_win",
  method: "decision",
  koTkoType: null,
  decisionType: "unanimous",
  dqReason: null,
  ncReason: null,
  ncNote: null,
  endRound: 3,
  endTimeSeconds: 300,
  referee: null,
  scorecards: null,
  bonuses: [],
  videoUrl: null,
  notes: null,
};
