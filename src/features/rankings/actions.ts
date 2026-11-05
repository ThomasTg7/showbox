"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import type { FighterSearchResult } from "@/features/events/card-actions";
import { revalidateFighter } from "@/features/fighters/cache";
import type { FormActionState } from "@/lib/form-errors";
import { requireAdmin } from "@/lib/require-admin";
import { runFormAction } from "@/lib/run-form-action";
import { revalidateRankings } from "./cache";
import { searchEligibleFighters, getDivisionGender } from "./admin-queries";
import { championSchema, dismissSchema, rankingScopeSchema, saveRankingSchema, vacateSchema, visibilitySchema } from "./schema";
import { dismissSuggestion, saveRanking, setChampion, setRankingVisibility, vacateTitle, type RankingChange } from "./service";

const INVALID: FormActionState = { error: "Datos inválidos" };
const run = (task: () => Promise<FormActionState>) => runFormAction("Error en rankings", task);

/** Expira lo público de un cambio de ranking o de título: los rankings y la ficha de cada boxeador afectado (`revalidateFighter` ya incluye `rankings`). */
function revalidateChange({ affectedFighterIds }: RankingChange): void {
  revalidateRankings();
  for (const id of affectedFighterIds) revalidateFighter(id);
  // Las pantallas del panel (listado de alcances y editor) leen versiones y títulos.
  revalidatePath("/admin/rankings");
  revalidatePath("/admin/rankings/[level]/[scope]", "page");
}

export async function saveRankingAction(scope: unknown, fighterIds: unknown, baseVersionId: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = saveRankingSchema.safeParse({ scope, fighterIds, baseVersionId });
  if (!parsed.success) return INVALID;
  return run(async () => {
    revalidateChange(await saveRanking(db, parsed.data.scope, parsed.data.fighterIds, admin.userId, { baseVersionId: parsed.data.baseVersionId }));
    return { success: "Nueva versión del ranking guardada" };
  });
}

export async function setChampionAction(level: unknown, divisionId: unknown, fighterId: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = championSchema.safeParse({ level, divisionId, fighterId });
  if (!parsed.success) return INVALID;
  return run(async () => {
    revalidateChange(await setChampion(db, parsed.data.level, parsed.data.divisionId, parsed.data.fighterId, admin.userId));
    return { success: "Campeón actualizado" };
  });
}

export async function vacateTitleAction(level: unknown, divisionId: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = vacateSchema.safeParse({ level, divisionId });
  if (!parsed.success) return INVALID;
  return run(async () => {
    revalidateChange(await vacateTitle(db, parsed.data.level, parsed.data.divisionId, admin.userId));
    return { success: "Título vacante" };
  });
}

export async function dismissSuggestionAction(eventId: unknown, fighterId: unknown, scopeKey: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = dismissSchema.safeParse({ eventId, fighterId, scopeKey });
  if (!parsed.success) return INVALID;
  return run(async () => {
    await dismissSuggestion(db, parsed.data.eventId, parsed.data.fighterId, parsed.data.scopeKey, admin.userId);
    revalidatePath("/admin/rankings/[level]/[scope]", "page");
    return {};
  });
}

/** Muestra u oculta los rankings y campeones de un nivel en el sitio (fichas, cartelera y `/boxeadores` incluidos: todo lee `rankings`). */
export async function setRankingVisibilityAction(level: unknown, isPublic: unknown): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = visibilitySchema.safeParse({ level, isPublic });
  if (!parsed.success) return INVALID;
  return run(async () => {
    await setRankingVisibility(db, parsed.data.level, parsed.data.isPublic, admin.userId);
    revalidateRankings();
    revalidatePath("/admin/rankings");
    revalidatePath("/admin/rankings/[level]/[scope]", "page");
    return { success: parsed.data.isPublic ? "Rankings visibles en el sitio" : "Puestos ocultos: el público solo ve a los campeones" };
  });
}

export type EligibleFighter = FighterSearchResult;

/** Buscador del editor y del selector de campeón: hasta 10 boxeadores elegibles del alcance (nunca la lista completa). */
export async function searchEligibleFightersAction(scope: unknown, query: unknown): Promise<EligibleFighter[]> {
  await requireAdmin();
  const parsed = rankingScopeSchema.safeParse(scope);
  const text = typeof query === "string" ? query.trim().slice(0, 60) : "";
  if (!parsed.success || text.length < 2) return [];
  const gender = parsed.data.divisionId ? await getDivisionGender(db, parsed.data.divisionId) : null;
  if (parsed.data.divisionId && !gender) return [];
  return searchEligibleFighters(db, { ...parsed.data, gender }, text);
}
