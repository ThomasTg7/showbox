import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { rankingEntries, rankingVersions } from "@/db/schema/rankings";
import type { Executor } from "@/db/types";
import type { BoutLevel } from "@/domain/bout-enums";
import type { RankingScope } from "@/domain/rankings";

export type RankedVersionRow = { id: string; level: BoutLevel; divisionId: string | null; createdAt: Date; rank: number };

/**
 * Las últimas `depth` versiones de cada alcance (rank 1 = la vigente, 2 = la anterior). Una sola consulta con ventana;
 * `filter` acota por nivel y, si se indica, por división (`null` = libra por libra).
 */
export async function listLatestVersions(
  db: Executor,
  filter: { level?: BoutLevel; divisionId?: string | null },
  depth: 1 | 2,
): Promise<RankedVersionRow[]> {
  const ranked = db
    .select({
      id: rankingVersions.id,
      level: rankingVersions.level,
      divisionId: rankingVersions.divisionId,
      createdAt: rankingVersions.createdAt,
      // `::int`: `row_number()` es bigint y postgres.js lo entrega como texto (PGlite, como número): `rank === 1` fallaría solo en Postgres real.
      rank: sql<number>`(row_number() over (partition by ${rankingVersions.level}, ${rankingVersions.divisionId} order by ${rankingVersions.createdAt} desc, ${rankingVersions.id} desc))::int`.as("rank"),
    })
    .from(rankingVersions)
    .where(
      and(
        filter.level ? eq(rankingVersions.level, filter.level) : undefined,
        filter.divisionId === undefined ? undefined : filter.divisionId === null ? isNull(rankingVersions.divisionId) : eq(rankingVersions.divisionId, filter.divisionId),
      ),
    )
    .as("ranked");
  return db.select().from(ranked).where(lte(ranked.rank, depth));
}

/** La versión vigente de un alcance y sus boxeadores en orden de puesto (sin ocultar a nadie: es lo que guardó el admin). */
export async function getCurrentRanking(db: Executor, scope: RankingScope): Promise<{ versionId: string; createdAt: Date; fighterIds: string[] } | null> {
  const [current] = await listLatestVersions(db, scope, 1);
  if (!current) return null;
  const entries = await db
    .select({ fighterId: rankingEntries.fighterId })
    .from(rankingEntries)
    .where(eq(rankingEntries.versionId, current.id))
    .orderBy(rankingEntries.position);
  return { versionId: current.id, createdAt: current.createdAt, fighterIds: entries.map((entry) => entry.fighterId) };
}
