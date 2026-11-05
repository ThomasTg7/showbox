"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SuggestionItem } from "../suggestions";

type SuggestionsPanelProps = {
  suggestions: SuggestionItem[];
  disabled: boolean;
  /** Aplica la sugerencia al borrador del editor (no guarda). */
  onAccept: (suggestion: SuggestionItem) => void;
  /** La descarta para ese evento: no vuelve a salir. */
  onDismiss: (suggestion: SuggestionItem) => void;
};

/** Sugerencias tras los resultados del último evento: cada una se acepta o se descarta. */
export function SuggestionsPanel({ suggestions, disabled, onAccept, onDismiss }: SuggestionsPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <section aria-labelledby="suggestions-title" className="flex flex-col gap-2 border border-primary bg-card p-3">
      <div>
        <h2 id="suggestions-title" className="text-lg font-semibold">
          Sugerencias tras {suggestions[0]?.eventName}
        </h2>
        <p className="text-sm text-muted-foreground">Aceptar solo mueve el borrador de abajo: el ranking cambia cuando guardas una nueva versión.</p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {suggestions.map((suggestion) => (
          <li key={`${suggestion.eventId}-${suggestion.fighterId}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
            <div className="min-w-0 flex-1 basis-56">
              <p className="font-medium">{suggestion.reason}</p>
              <p className="text-sm text-muted-foreground">
                {suggestion.kind === "enter" ? `Sugerencia: que entre al puesto ${suggestion.toPosition}` : `Sugerencia: que suba al puesto ${suggestion.toPosition}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" disabled={disabled} onClick={() => onAccept(suggestion)} aria-label={`Aceptar: ${suggestion.reason}`}>
                <Check aria-hidden /> Aceptar
              </Button>
              <Button type="button" variant="outline" disabled={disabled} onClick={() => onDismiss(suggestion)} aria-label={`Descartar: ${suggestion.reason}`}>
                <X aria-hidden /> Descartar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
