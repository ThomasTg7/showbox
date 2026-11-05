import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighters } from "@/db/schema/fighters";
import { rankingEntries, titles } from "@/db/schema/rankings";
import type { BoutLevel } from "@/domain/bout-enums";
import { P4P_SLOTS, type RankingScope } from "@/domain/rankings";
import type { FighterSearchResult } from "@/features/events/card-actions";
import { filterConditions } from "@/features/fighters/query-helpers";
import { divisionTitle } from "@/features/fighters/labels";
import type { EditorFighter } from "./dto";
import { eligibleFighter, visibleRankedFighter } from "./eligibility";
import { listSuggestions } from "./suggestions";
import { listLatestVersions } from "./versions";

/** Un alcance (P4P o una división) tal como lo muestran las pantallas del panel. */
export type RankingScopeInfo = RankingScope & {
  /** `p4p` o el slug de la división: va en la URL. */
  slug: string;
  label: string;
  slots: number;
  gender: "male" | "female" | null;
};

const P4P_SCOPE = (level: BoutLevel): RankingScopeInfo => ({ level, divisionId: null, slug: "p4p", label: "Libra por libra", slots: P4P_SLOTS, gender: null });

export async function resolveScope(db: Db, level: BoutLevel, slug: string): Promise<RankingScopeInfo | null> {
  if (slug === "p4p") return P4P_SCOPE(level);
  const [division] = await db.select().from(divisions).where(eq(divisions.slug, slug)).limit(1);
  if (!division) return null;
  return { level, divisionId: division.id, slug: division.slug, label: divisionTitle(division), slots: division.rankingSlots, gender: division.gender };
}

export type RankingEditorData = {
  scope: RankingScopeInfo;
  champion: EditorFighter | null;
  entries: EditorFighter[];
  /** La versión vigente (el borrador se arma sobre ella) y su fecha ISO. */
  versionId: string | null;
  updatedAt: string | null;
};

const editorColumns = {
  id: fighters.id,
  firstName: fighters.firstName,
  lastName: fighters.lastName,
  nationality: fighters.nationality,
  careerStatus: fighters.careerStatus,
  deleted: sql<boolean>`${fighters.deletedAt} is not null`,
  visible: sql<boolean>`coalesce(${visibleRankedFighter}, false)`,
};

type EditorRow = { id: string; firstName: string; lastName: string; nationality: string; careerStatus: "active" | "inactive" | "retired"; deleted: boolean; visible: boolean };

function toEditorFighter(row: EditorRow): EditorFighter {
  const note = row.deleted ? "En la papelera" : row.careerStatus === "retired" ? "Retirado" : row.careerStatus === "inactive" ? "Inactivo" : "No publicado";
  return { id: row.id, name: `${row.firstName} ${row.lastName}`, nationality: row.nationality, hiddenNote: row.visible ? null : note };
}

/** Lo que el editor necesita: el ranking vigente tal como se guardó (también quien ya no se ve, para poder quitarlo) y el campeón. */
export async function getRankingEditorData(db: Db, scope: RankingScopeInfo): Promise<RankingEditorData> {
  const [current] = await listLatestVersions(db, scope, 1);
  const [entryRows, championRows] = await Promise.all([
    current
      ? db
          .select(editorColumns)
          .from(rankingEntries)
          .innerJoin(fighters, eq(fighters.id, rankingEntries.fighterId))
          .where(eq(rankingEntries.versionId, current.id))
          .orderBy(asc(rankingEntries.position))
      : [],
    scope.divisionId
      ? db
          .select(editorColumns)
          .from(titles)
          .innerJoin(fighters, eq(fighters.id, titles.championFighterId))
          .where(and(eq(titles.level, scope.level), eq(titles.divisionId, scope.divisionId)))
      : [],
  ]);
  return {
    scope,
    champion: championRows[0] ? toEditorFighter(championRows[0]) : null,
    entries: entryRows.map(toEditorFighter),
    versionId: current?.id ?? null,
    updatedAt: current ? current.createdAt.toISOString() : null,
  };
}

export type ScopeOverview = {
  scope: RankingScopeInfo;
  /** `undefined` en libra por libra (no tiene campeón). */
  championName: string | null | undefined;
  entryCount: number;
  updatedAt: string | null;
  suggestionCount: number;
};

/** La lista de alcances de un nivel: libra por libra y cada división activa, con su campeón, puestos y sugerencias pendientes. */
export async function listScopeOverview(db: Db, level: BoutLevel): Promise<ScopeOverview[]> {
  const [divisionRows, latest, championRows, suggestions] = await Promise.all([
    db.select().from(divisions).where(eq(divisions.active, true)).orderBy(asc(divisions.gender), asc(divisions.sortOrder)),
    listLatestVersions(db, { level }, 1),
    db
      .select({ divisionId: titles.divisionId, firstName: fighters.firstName, lastName: fighters.lastName })
      .from(titles)
      .innerJoin(fighters, eq(fighters.id, titles.championFighterId))
      .where(eq(titles.level, level)),
    listSuggestions(db, level),
  ]);
  const countRows =
    latest.length === 0
      ? []
      : await db
          .select({ versionId: rankingEntries.versionId, total: count() })
          .from(rankingEntries)
          .where(inArray(rankingEntries.versionId, latest.map((version) => version.id)))
          .groupBy(rankingEntries.versionId);
  const totalOf = new Map(countRows.map((row) => [row.versionId, row.total]));
  const championOf = new Map(championRows.map((row) => [row.divisionId, `${row.firstName} ${row.lastName}`]));
  const versionOf = new Map(latest.map((version) => [version.divisionId ?? "p4p", version]));

  const scopes: RankingScopeInfo[] = [
    P4P_SCOPE(level),
    ...divisionRows.map((division): RankingScopeInfo => ({ level, divisionId: division.id, slug: division.slug, label: divisionTitle(division), slots: division.rankingSlots, gender: division.gender })),
  ];
  return scopes.map((scope) => {
    const version = versionOf.get(scope.divisionId ?? "p4p");
    return {
      scope,
      championName: scope.divisionId === null ? undefined : (championOf.get(scope.divisionId) ?? null),
      entryCount: version ? (totalOf.get(version.id) ?? 0) : 0,
      updatedAt: version ? version.createdAt.toISOString() : null,
      suggestionCount: scope.divisionId ? (suggestions.get(scope.divisionId)?.length ?? 0) : 0,
    };
  });
}

const SEARCH_RESULTS = 10;

/** Buscador del editor y del selector de campeón: hasta 10 boxeadores elegibles del alcance por nombre, apellido o apodo. */
export async function searchEligibleFighters(db: Db, scope: RankingScope & { gender: "male" | "female" | null }, text: string): Promise<FighterSearchResult[]> {
  const rows = await db
    .select({
      id: fighters.id,
      firstName: fighters.firstName,
      lastName: fighters.lastName,
      nickname: fighters.nickname,
      nationality: fighters.nationality,
      status: fighters.status,
      careerStatus: fighters.careerStatus,
      divisionName: divisions.name,
    })
    .from(fighters)
    .innerJoin(divisions, eq(divisions.id, fighters.divisionId))
    .where(and(eligibleFighter(scope.level, scope.gender), ...filterConditions({ q: text })))
    .orderBy(asc(fighters.lastName), asc(fighters.firstName))
    .limit(SEARCH_RESULTS);
  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`,
    nickname: row.nickname,
    divisionName: row.divisionName,
    nationality: row.nationality,
    status: row.status,
    careerStatus: row.careerStatus,
  }));
}

/** Género de una división (el buscador de elegibles lo necesita); `null` si no existe. */
export async function getDivisionGender(db: Db, divisionId: string): Promise<"male" | "female" | null> {
  const [division] = await db.select({ gender: divisions.gender }).from(divisions).where(eq(divisions.id, divisionId)).limit(1);
  return division?.gender ?? null;
}
