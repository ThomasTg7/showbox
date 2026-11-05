import { eq } from "drizzle-orm";
import { rankingLevels } from "@/db/schema/rankings";
import type { Executor } from "@/db/types";
import type { BoutLevel } from "@/domain/bout-enums";

/** Niveles cuyos rankings y campeones ve el público (sin fila = oculto: se arman en el panel antes de mostrarlos). */
export async function listPublicLevels(db: Executor): Promise<Set<BoutLevel>> {
  const rows = await db.select({ level: rankingLevels.level }).from(rankingLevels).where(eq(rankingLevels.isPublic, true));
  return new Set(rows.map((row) => row.level));
}

export async function isLevelPublic(db: Executor, level: BoutLevel): Promise<boolean> {
  return (await listPublicLevels(db)).has(level);
}
