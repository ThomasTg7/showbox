import { Label } from "@/components/ui/label";

type RangeFieldProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Texto del valor actual ("120%"). */
  display?: string;
  /** El nombre visible puede omitirse si hay otro texto que ya lo dice (queda como etiqueta accesible). */
  hideLabel?: boolean;
};

export function RangeField({ id, label, value, min, max, step, onChange, display, hideLabel = false }: RangeFieldProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className={hideLabel ? "sr-only" : "flex items-baseline justify-between gap-2"}>
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {display ? <span className="text-xs text-muted-foreground tabular-nums">{display}</span> : null}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-full cursor-pointer accent-primary pointer-coarse:h-11"
      />
    </div>
  );
}
