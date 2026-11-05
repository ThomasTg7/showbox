import { Crop, Crosshair } from "lucide-react";
import { cn } from "@/lib/cn";

export type EditorMode = "crop" | "focus";

const OPTIONS = [
  { mode: "crop", label: "Recortar", shortLabel: "Recortar", Icon: Crop },
  { mode: "focus", label: "Punto de enfoque", shortLabel: "Enfoque", Icon: Crosshair },
] as const;

type ModeSwitchProps = {
  value: EditorMode;
  onChange: (mode: EditorMode) => void;
};

/** Selector de dos opciones, grande y con texto: se entiende y se toca bien en celular. */
export function ModeSwitch({ value, onChange }: ModeSwitchProps) {
  return (
    <div role="group" aria-label="Modo del editor" className="grid grid-cols-2 gap-1 bg-muted p-1">
      {OPTIONS.map(({ mode, label, shortLabel, Icon }) => (
        <button
          key={mode}
          type="button"
          aria-label={label}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold uppercase tracking-wide transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            value === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon aria-hidden className="size-4" />
          <span aria-hidden className="sm:hidden">{shortLabel}</span>
          <span aria-hidden className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
