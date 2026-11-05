import type { BoutLevel } from "./bout-enums";

/** Puestos del ranking libra por libra (el de cada división está en `divisions.ranking_slots`). */
export const P4P_SLOTS = 10;

/** Alcance de un ranking: nivel + división (`null` = libra por libra). */
export type RankingScope = { level: BoutLevel; divisionId: string | null };

/** Clave estable de un alcance (descartes de sugerencias, URLs). */
export function rankingScopeKey(scope: RankingScope): string {
  return `${scope.level}:${scope.divisionId ?? "p4p"}`;
}

/** «Campeón» o «Campeona» según la división (género del título, no del texto). */
export function championWord(gender: "male" | "female"): string {
  return gender === "female" ? "Campeona" : "Campeón";
}

export type Movement = { kind: "up" | "down"; by: number } | { kind: "new" } | { kind: "same" };

/** Movimiento de cada boxeador de la versión actual contra la anterior (arreglos de id por posición). Sin anterior, todos son nuevos. */
export function computeMovement(current: string[], previous: string[] | null): Map<string, Movement> {
  const previousPosition = new Map((previous ?? []).map((id, index) => [id, index]));
  const result = new Map<string, Movement>();
  current.forEach((id, index) => {
    const before = previousPosition.get(id);
    if (before === undefined) result.set(id, { kind: "new" });
    else if (before > index) result.set(id, { kind: "up", by: before - index });
    else if (before < index) result.set(id, { kind: "down", by: index - before });
    else result.set(id, { kind: "same" });
  });
  return result;
}

export type RankingSuggestion =
  | { kind: "move"; fighterId: string; toPosition: number; reason: string }
  | { kind: "enter"; fighterId: string; toPosition: number; reason: string };

export type RankedResult = { winnerId: string; loserId: string; winnerName: string; loserName: string };

/**
 * Sugerencias tras un evento: si el ganador está peor rankeado (o sin ranking) que el perdedor rankeado, subirlo a la
 * posición del perdedor. Vencer al campeón no sugiere nada: lo maneja el cambio de título. Posiciones desde 1.
 */
export function suggestAfterEvent(input: {
  ranking: string[];
  championId: string | null;
  slots: number;
  results: RankedResult[];
}): RankingSuggestion[] {
  const position = (id: string) => {
    const index = input.ranking.indexOf(id);
    return index === -1 ? null : index + 1;
  };
  const suggestions: RankingSuggestion[] = [];
  for (const result of input.results) {
    if (result.winnerId === input.championId || result.loserId === input.championId) continue;
    const loserPosition = position(result.loserId);
    if (loserPosition === null || loserPosition > input.slots) continue;
    const winnerPosition = position(result.winnerId);
    if (winnerPosition !== null && winnerPosition < loserPosition) continue;
    const winnerLabel = winnerPosition === null ? "sin ranking" : `#${winnerPosition}`;
    suggestions.push({
      kind: winnerPosition === null ? "enter" : "move",
      fighterId: result.winnerId,
      toPosition: loserPosition,
      reason: `${result.winnerName} (${winnerLabel}) venció a ${result.loserName} (#${loserPosition})`,
    });
  }
  return suggestions;
}

/** Aplica una sugerencia a un borrador: saca al boxeador de donde estaba, lo pone en la posición y recorta a los puestos. */
export function applySuggestion(ranking: string[], suggestion: RankingSuggestion, slots: number): string[] {
  const without = ranking.filter((id) => id !== suggestion.fighterId);
  without.splice(suggestion.toPosition - 1, 0, suggestion.fighterId);
  return without.slice(0, slots);
}

/** Errores (en español) de un ranking a guardar; vacío si es válido. `nameOf` da un nombre legible en vez del id. */
export function validateRanking(
  entries: string[],
  ctx: { slots: number; championId: string | null; eligible: Set<string>; nameOf?: (id: string) => string },
): string[] {
  const errors: string[] = [];
  if (entries.length > ctx.slots) errors.push(`Máximo ${ctx.slots} puestos`);
  if (new Set(entries).size !== entries.length) errors.push("Boxeador repetido");
  if (ctx.championId !== null && entries.includes(ctx.championId)) errors.push("El campeón no puede estar en el ranking numerado");
  for (const id of new Set(entries)) {
    if (id !== ctx.championId && !ctx.eligible.has(id)) errors.push(`${ctx.nameOf?.(id) ?? id} no es elegible`);
  }
  return errors;
}
