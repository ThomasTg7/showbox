import type { Db } from "@/db";
import { rankingLevels } from "@/db/schema/rankings";
import type { BoutLevel } from "@/domain/bout-enums";
import { createFighter } from "@/features/fighters/service";
import { divisionIdBySlug, validFighterInput } from "@/features/fighters/test-helpers";

let counter = 0;

/** Boxeador publicado, activo y con récord profesional manual (elegible a ranking pro) en la división dada. */
export async function insertRankableFighter(
  db: Db,
  divisionId: string,
  overrides: { firstName?: string; lastName?: string; gender?: "male" | "female"; level?: BoutLevel; careerStatus?: "active" | "inactive" | "retired" } = {},
): Promise<string> {
  counter += 1;
  const { level = "pro", ...rest } = overrides;
  const created = await createFighter(
    db,
    validFighterInput(divisionId, {
      firstName: rest.firstName ?? `Boxeador${counter}`,
      lastName: rest.lastName ?? `Rankeable${counter}`,
      ...(rest.gender ? { gender: rest.gender } : {}),
      ...(rest.careerStatus ? { careerStatus: rest.careerStatus } : {}),
      status: "published",
      ...(level === "pro" ? { proWins: 3 } : { amWins: 3 }),
    }),
    "admin-1",
  );
  return created.id;
}

/** Los dos niveles a la vista del público (sin fila están ocultos). */
export async function showRankingLevels(db: Db): Promise<void> {
  await db.insert(rankingLevels).values([{ level: "pro", isPublic: true }, { level: "amateur", isPublic: true }]).onConflictDoNothing();
}

export { divisionIdBySlug };
