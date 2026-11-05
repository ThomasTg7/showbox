import { applySuggestion } from "@/domain/rankings";
import type { EditorFighter } from "./dto";
import type { SuggestionItem } from "./suggestions";

// El borrador del editor: el ranking que se está armando antes de guardarlo como versión nueva.

/** Aplica una sugerencia al borrador; quien entra viene con el nombre que trae la sugerencia (aún no está en la lista). */
export function applySuggestionToDraft(draft: EditorFighter[], suggestion: SuggestionItem, slots: number): EditorFighter[] {
  const known = new Map(draft.map((fighter) => [fighter.id, fighter]));
  const ids = applySuggestion(draft.map((fighter) => fighter.id), suggestion, slots);
  return ids.map((id) => known.get(id) ?? { id, name: suggestion.fighterName, nationality: suggestion.fighterNationality, hiddenNote: null });
}

/** Agrega al final; no repite a nadie ni pasa de los puestos de la división. */
export function addToDraft(draft: EditorFighter[], fighter: EditorFighter, slots: number): EditorFighter[] {
  if (draft.length >= slots || draft.some((candidate) => candidate.id === fighter.id)) return draft;
  return [...draft, fighter];
}

/** ¿Cambió algo respecto de lo guardado? Solo cuenta quién está y en qué orden. */
export function isDraftDirty(saved: EditorFighter[], draft: EditorFighter[]): boolean {
  return saved.length !== draft.length || saved.some((fighter, index) => fighter.id !== draft[index]?.id);
}
