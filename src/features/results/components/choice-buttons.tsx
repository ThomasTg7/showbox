"use client";

type Choice<T extends string> = { value: T; label: string; /** Nombre accesible cuando el texto solo no alcanza (p. ej. el número de round). */ ariaLabel?: string; hint?: string; disabled?: boolean; tone?: "red" | "blue" };

type ChoiceButtonsProps<T extends string> = {
  legend: string;
  options: Choice<T>[];
  value: T | "";
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4 | 5;
  error?: string;
};

const COLUMNS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" } as const;

/** Botones grandes de una lista cerrada (resultado, método, round…): se tocan con el pulgar y quedan marcados. */
export function ChoiceButtons<T extends string>({ legend, options, value, onChange, columns = 2, error }: ChoiceButtonsProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-muted-foreground uppercase tracking-wide">{legend}</legend>
      <div className={`grid gap-2 ${COLUMNS[columns]}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              aria-pressed={selected}
              aria-label={option.ariaLabel}
              onClick={() => onChange(option.value)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 border px-2 py-2 text-center font-semibold transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              } ${option.tone === "red" ? "border-l-4 border-l-[#D7263D]" : option.tone === "blue" ? "border-l-4 border-l-[#1E6FD9]" : ""}`}
            >
              <span>{option.label}</span>
              {option.hint ? <span className={`text-xs font-normal ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{option.hint}</span> : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
