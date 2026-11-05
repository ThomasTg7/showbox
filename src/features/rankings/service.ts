import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { dismissedSuggestions, rankingEntries, rankingLevels, rankingVersions, titles } from "@/db/schema/rankings";
import type { Executor } from "@/db/types";
import type { BoutLevel } from "@/domain/bout-enums";
import { P4P_SLOTS, rankingScopeKey, validateRanking, type RankingScope } from "@/domain/rankings";
import { logAudit } from "@/features/audit/log";
import { divisionTitle } from "@/features/fighters/labels";
import { toLocalInputs } from "@/lib/local-time";
import { UserFacingError } from "@/lib/user-facing-error";
import { eligibleFighter } from "./eligibility";
import { getCurrentRanking } from "./versions";

const DIVISION_NOT_FOUND = "No se encontró la división";
const STALE_DRAFT = "Otra persona guardó este ranking mientras lo editabas. Recarga la página para ver la versión nueva y vuelve a aplicar tus cambios.";
const LEVEL_LABEL: Record<BoutLevel, string> = { pro: "pro", amateur: "amateur" };

type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
type ScopeContext = { slots: number; gender: "male" | "female" | null; label: string; championId: string | null };

/**
 * Serializa las escrituras de un alcance (dos admins a la vez, o el editor y un cambio de título) con un bloqueo
 * consultivo de la transacción (Postgres estándar). Todo lo que se valida se lee después de tomarlo.
 */
async function lockScope(tx: Transaction, scope: RankingScope): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ranking:${rankingScopeKey(scope)}`}))`);
}

/** Cuántos puestos tiene el alcance, de qué género se puede rankear y quién es el campeón (solo una división tiene). */
async function loadScope(db: Executor, scope: RankingScope): Promise<ScopeContext> {
  if (scope.divisionId === null) return { slots: P4P_SLOTS, gender: null, label: "libra por libra", championId: null };
  const [division] = await db
    .select({ name: divisions.name, gender: divisions.gender, slots: divisions.rankingSlots, active: divisions.active, championId: titles.championFighterId })
    .from(divisions)
    .leftJoin(titles, and(eq(titles.divisionId, divisions.id), eq(titles.level, scope.level)))
    .where(eq(divisions.id, scope.divisionId))
    .limit(1);
  if (!division) throw new UserFacingError(DIVISION_NOT_FOUND);
  if (!division.active) throw new UserFacingError("Esa división está inactiva. Actívala en Divisiones.");
  return { slots: division.slots, gender: division.gender, label: divisionTitle(division), championId: division.championId };
}

/** De esos boxeadores, los que hoy pueden entrar al ranking del alcance (una consulta). */
async function eligibleAmong(db: Executor, scope: RankingScope, gender: ScopeContext["gender"], ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: fighters.id })
    .from(fighters)
    .where(and(inArray(fighters.id, ids), eligibleFighter(scope.level, gender)));
  return new Set(rows.map((row) => row.id));
}

async function fighterNames(db: Executor, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select({ id: fighters.id, firstName: fighters.firstName, lastName: fighters.lastName }).from(fighters).where(inArray(fighters.id, ids));
  return new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`]));
}

/** Crea una versión nueva con los boxeadores en ese orden (puestos desde 1). */
async function writeVersion(tx: Executor, scope: RankingScope, fighterIds: string[], actorId: string): Promise<string> {
  // `clock_timestamp()` y no `now()` (el inicio de la transacción): con el bloqueo, la última en guardarse es la más nueva.
  const [version] = await tx
    .insert(rankingVersions)
    .values({ level: scope.level, divisionId: scope.divisionId, createdBy: actorId, createdAt: sql`clock_timestamp()` })
    .returning({ id: rankingVersions.id });
  if (!version) throw new UserFacingError("No se pudo guardar el ranking");
  if (fighterIds.length > 0) {
    await tx.insert(rankingEntries).values(fighterIds.map((fighterId, index) => ({ versionId: version.id, position: index + 1, fighterId })));
  }
  return version.id;
}

export type RankingChange = { affectedFighterIds: string[] };

/**
 * Guarda una versión nueva del ranking (siempre; una versión nunca se edita). Se rechaza con más puestos que los de la
 * división, un boxeador repetido, el campeón de la división o alguien no elegible; y, con `baseVersionId` (la versión
 * sobre la que se armó el borrador; `null` = no había), si otra persona guardó entretanto. Devuelve a quienes entran,
 * salen o se mueven para que la action expire sus fichas.
 */
export async function saveRanking(
  db: Db,
  scope: RankingScope,
  fighterIds: string[],
  actorId: string,
  options: { baseVersionId?: string | null } = {},
): Promise<RankingChange & { versionId: string }> {
  return db.transaction(async (tx) => {
    await lockScope(tx, scope);
    const context = await loadScope(tx, scope);
    const previous = await getCurrentRanking(tx, scope);
    if (options.baseVersionId !== undefined && (previous?.versionId ?? null) !== options.baseVersionId) throw new UserFacingError(STALE_DRAFT);
    const eligible = await eligibleAmong(tx, scope, context.gender, fighterIds);
    const names = await fighterNames(tx, fighterIds);
    const errors = validateRanking(fighterIds, { slots: context.slots, championId: context.championId, eligible, nameOf: (id) => names.get(id) ?? id });
    if (errors.length > 0) throw new UserFacingError(errors.join(". "));

    const versionId = await writeVersion(tx, scope, fighterIds, actorId);
    await logAudit(tx, {
      actorId,
      action: "create",
      entityType: "ranking",
      entityId: versionId,
      summary: `Guardó el ranking ${LEVEL_LABEL[scope.level]} de ${context.label}: ${fighterIds.length} puestos`,
      diff: { antes: previous?.fighterIds ?? [], despues: fighterIds },
    });
    return { versionId, affectedFighterIds: [...new Set([...(previous?.fighterIds ?? []), ...fighterIds])] };
  });
}

/**
 * Corona a un boxeador como campeón actual de la división y el nivel (reemplaza al anterior). Un campeón no ocupa número:
 * si estaba en el ranking, se guarda una versión sin él; y el campeón anterior, si sigue elegible, queda #1 (con el
 * ranking completo, sale el último).
 */
export async function setChampion(db: Db, level: BoutLevel, divisionId: string, fighterId: string, actorId: string): Promise<RankingChange> {
  const scope: RankingScope = { level, divisionId };
  return db.transaction(async (tx) => {
    await lockScope(tx, scope);
    const context = await loadScope(tx, scope);
    const eligible = await eligibleAmong(tx, scope, context.gender, [fighterId]);
    if (!eligible.has(fighterId)) {
      throw new UserFacingError("Ese boxeador no puede ser campeón: debe estar activo, publicado, ser del género de la división y tener peleas del nivel");
    }
    if (context.championId === fighterId) return { affectedFighterIds: [] };

    const current = await getCurrentRanking(tx, scope);
    const stillEligible = context.championId ? await eligibleAmong(tx, scope, context.gender, [context.championId]) : new Set<string>();
    const formerChampionId = context.championId && stillEligible.has(context.championId) ? context.championId : null;
    const ranked = (current?.fighterIds ?? []).filter((id) => id !== fighterId);
    const nextRanking = formerChampionId ? [formerChampionId, ...ranked.filter((id) => id !== formerChampionId)].slice(0, context.slots) : ranked;
    const rankingChanged = JSON.stringify(nextRanking) !== JSON.stringify(current?.fighterIds ?? []);
    const names = await fighterNames(tx, [fighterId, ...(context.championId ? [context.championId] : [])]);
    const since = toLocalInputs(new Date()).date;

    const [saved] = await tx
      .insert(titles)
      .values({ level, divisionId, championFighterId: fighterId, since })
      .onConflictDoUpdate({ target: [titles.level, titles.divisionId], set: { championFighterId: fighterId, since } })
      .returning({ id: titles.id });
    const before = context.championId ? ` (antes: ${names.get(context.championId) ?? "—"})` : "";
    await logAudit(tx, {
      actorId,
      action: "update",
      entityType: "title",
      entityId: saved?.id ?? divisionId,
      summary: `Coronó a ${names.get(fighterId) ?? "—"} campeón ${LEVEL_LABEL[level]} de ${context.label}${before}`,
    });
    if (rankingChanged) {
      const versionId = await writeVersion(tx, scope, nextRanking, actorId);
      await logAudit(tx, {
        actorId,
        action: "create",
        entityType: "ranking",
        entityId: versionId,
        summary: `Guardó el ranking ${LEVEL_LABEL[level]} de ${context.label} tras el cambio de título: ${nextRanking.length} puestos`,
        diff: { antes: current?.fighterIds ?? [], despues: nextRanking },
      });
    }
    return { affectedFighterIds: [...new Set([fighterId, ...(context.championId ? [context.championId] : []), ...(current?.fighterIds ?? []), ...nextRanking])] };
  });
}

/** Deja el título vacante (no cambia el ranking: el campeón anterior sale de la vista pública y la promotora decide dónde va). */
export async function vacateTitle(db: Db, level: BoutLevel, divisionId: string, actorId: string): Promise<RankingChange> {
  const scope: RankingScope = { level, divisionId };
  return db.transaction(async (tx) => {
    await lockScope(tx, scope);
    const context = await loadScope(tx, scope);
    const formerChampionId = context.championId;
    if (formerChampionId === null) throw new UserFacingError("El título ya está vacante");
    const names = await fighterNames(tx, [formerChampionId]);

    const [title] = await tx
      .update(titles)
      .set({ championFighterId: null, since: null })
      .where(and(eq(titles.level, level), eq(titles.divisionId, divisionId)))
      .returning({ id: titles.id });
    await logAudit(tx, {
      actorId,
      action: "update",
      entityType: "title",
      entityId: title?.id ?? divisionId,
      summary: `Dejó vacante el título ${LEVEL_LABEL[level]} de ${context.label} (campeón anterior: ${names.get(formerChampionId) ?? "—"})`,
    });
    return { affectedFighterIds: [formerChampionId] };
  });
}

/** El admin descarta una sugerencia: no vuelve a salir para ese evento y alcance. */
export async function dismissSuggestion(db: Db, eventId: string, fighterId: string, scopeKey: string, actorId: string): Promise<void> {
  const [event] = await db.select({ name: events.name }).from(events).where(and(eq(events.id, eventId), isNull(events.deletedAt))).limit(1);
  if (!event) throw new UserFacingError("No se encontró el evento");
  const names = await fighterNames(db, [fighterId]);
  const name = names.get(fighterId);
  if (!name) throw new UserFacingError("No se encontró al boxeador");

  await db.transaction(async (tx) => {
    await tx.insert(dismissedSuggestions).values({ eventId, fighterId, scopeKey }).onConflictDoNothing();
    await logAudit(tx, { actorId, action: "update", entityType: "ranking", entityId: eventId, summary: `Descartó la sugerencia de ranking para ${name} tras ${event.name} (${scopeKey})` });
  });
}

/** Muestra u oculta en el sitio los rankings y campeones de un nivel (se pueden seguir editando en el panel). */
export async function setRankingVisibility(db: Db, level: BoutLevel, isPublic: boolean, actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(rankingLevels)
      .values({ level, isPublic })
      .onConflictDoUpdate({ target: rankingLevels.level, set: { isPublic, updatedAt: sql`now()` } });
    await logAudit(tx, {
      actorId,
      action: "update",
      entityType: "ranking",
      entityId: level,
      summary: isPublic ? `Mostró en el sitio los rankings ${LEVEL_LABEL[level]}` : `Ocultó del sitio los puestos del ranking ${LEVEL_LABEL[level]} (los campeones siguen a la vista)`,
    });
  });
}
