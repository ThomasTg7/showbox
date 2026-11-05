"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_SCORECARDS } from "@/domain/bout-result";
import { cn } from "@/lib/cn";
import type { ScorecardDraft, ScorecardMode } from "../result-draft";
import { ScorecardRoundsGrid } from "./scorecard-rounds-grid";

type ScorecardsEditorProps = {
  cards: ScorecardDraft[];
  mode: ScorecardMode;
  /** Cuántos rounds se puntúan en el modo «por round» (`scorecardRoundCount`). */
  roundCount: number;
  redName: string;
  blueName: string;
  error?: string;
  /** Texto bajo el título (p. ej. en un KO: las tarjetas muestran cómo iba la pelea). */
  hint?: string;
  onChange: (cards: ScorecardDraft[]) => void;
  onModeChange: (mode: ScorecardMode) => void;
  /** Solo en una decisión: con las tarjetas completas propone el resultado y el tipo; devuelve un aviso si no puede. */
  onSuggest?: () => string | null;
};

const MODES: { value: ScorecardMode; label: string }[] = [
  { value: "total", label: "Solo el total" },
  { value: "rounds", label: "Round por round" },
];

/**
 * Tarjetas de los jueces (opcionales, hasta 5): el total de cada esquina, o round por round con los descuentos de
 * puntos de cada round y el total sumado solo.
 */
export function ScorecardsEditor({ cards, mode, roundCount, redName, blueName, error, hint, onChange, onModeChange, onSuggest }: ScorecardsEditorProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);

  function update(index: number, changes: Partial<ScorecardDraft>) {
    onChange(cards.map((card, position) => (position === index ? { ...card, ...changes } : card)));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Tarjetas de los jueces (opcional)</legend>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}

      <div role="radiogroup" aria-label="Cómo anotar las tarjetas" className="inline-flex w-fit border border-border">
        {MODES.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex min-h-11 cursor-pointer items-center px-4 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              mode === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input type="radio" name="scorecard-mode" value={option.value} checked={mode === option.value} onChange={() => onModeChange(option.value)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>

      {mode === "rounds" && roundCount === 0 ? (
        <p className="text-sm text-muted-foreground">La pelea terminó en el primer round: no hay rounds terminados que puntuar.</p>
      ) : null}

      {cards.map((card, index) => {
        const number = index + 1;
        const remove = (
          <Button type="button" variant="outline" size="icon" aria-label={`Quitar tarjeta ${number}`} onClick={() => onChange(cards.filter((_, position) => position !== index))}>
            <Trash2 aria-hidden />
          </Button>
        );
        const judge = (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Tarjeta {number}: juez
            <Input value={card.judge} onChange={(event) => update(index, { judge: event.target.value })} placeholder={`Juez ${number}`} autoComplete="off" />
          </label>
        );

        if (mode === "total") {
          return (
            <div key={index} className="grid grid-cols-[1fr_5rem_5rem_auto] items-end gap-2">
              {judge}
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Tarjeta {number}: puntos de {redName}
                <Input value={card.red} onChange={(event) => update(index, { red: event.target.value })} inputMode="numeric" placeholder="29" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Tarjeta {number}: puntos de {blueName}
                <Input value={card.blue} onChange={(event) => update(index, { blue: event.target.value })} inputMode="numeric" placeholder="28" />
              </label>
              {remove}
            </div>
          );
        }

        return (
          <div key={index} className="flex flex-col gap-2 border border-border p-3">
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              {judge}
              {remove}
            </div>
            <ScorecardRoundsGrid card={card} number={number} roundCount={roundCount} redName={redName} blueName={blueName} onChange={(rounds) => update(index, { rounds })} />
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={cards.length >= MAX_SCORECARDS} onClick={() => onChange([...cards, { judge: "", red: "", blue: "" }])}>
          <Plus aria-hidden /> Agregar tarjeta
        </Button>
        {onSuggest && cards.length >= 3 ? (
          <Button type="button" variant="outline" onClick={() => setSuggestion(onSuggest())}>
            Sugerir desde tarjetas
          </Button>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {cards.length} de {MAX_SCORECARDS}
        </span>
      </div>
      {suggestion ? <p className="text-sm text-muted-foreground">{suggestion}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
