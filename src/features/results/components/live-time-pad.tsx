"use client";

import { Delete } from "lucide-react";
import { digitsToClock, pressBackspace, pressDigit } from "../time-keypad";

type LiveTimePadProps = {
  digits: string;
  /** Máximo del round (para el recordatorio bajo el reloj). */
  maxLabel: string;
  error?: string;
  onChange: (digits: string) => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Reloj con teclado numérico para escribir el tiempo del round con una mano: 3, 4, 2 → 3:42. */
export function LiveTimePad({ digits, maxLabel, error, onChange }: LiveTimePadProps) {
  const clock = digitsToClock(digits);
  const keyClass = "min-h-14 border border-border bg-card text-2xl font-semibold hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted";

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-muted-foreground uppercase tracking-wide">Tiempo del round</legend>
      <output aria-live="polite" aria-label="Tiempo escrito" className="border border-border bg-card py-3 text-center font-display text-5xl tabular-nums">
        {clock || "–:––"}
      </output>
      <p className="text-center text-xs text-muted-foreground">Máximo {maxLabel}. Escribe los números seguidos: 3 4 2 es 3:42.</p>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button key={key} type="button" className={keyClass} onClick={() => onChange(pressDigit(digits, key))}>
            {key}
          </button>
        ))}
        <button type="button" className={`${keyClass} text-base`} onClick={() => onChange("")}>
          Borrar
        </button>
        <button type="button" className={keyClass} onClick={() => onChange(pressDigit(digits, "0"))}>
          0
        </button>
        <button type="button" className={`${keyClass} flex items-center justify-center`} aria-label="Borrar el último número" onClick={() => onChange(pressBackspace(digits))}>
          <Delete aria-hidden className="size-6" />
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
