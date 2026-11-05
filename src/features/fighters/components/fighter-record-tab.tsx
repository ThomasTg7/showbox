"use client";
import { BRAND } from "@/domain/brand";

import { TextField } from "@/components/admin/form-fields";

const GROUPS = [
  { title: "Profesional", prefix: "pro" },
  { title: "Amateur", prefix: "am" },
] as const;

const COUNTERS = [
  { suffix: "Wins", label: "Victorias" },
  { suffix: "Losses", label: "Derrotas" },
  { suffix: "Draws", label: "Empates" },
  { suffix: "NoContests", label: "Sin resultado" },
] as const;

export function FighterRecordTab() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-prose text-muted-foreground">
        Récord total de toda la carrera, cargado a mano. El récord en la promotora se calcula solo con las peleas de
        {BRAND.name} y se muestra aparte.
      </p>
      {GROUPS.map((group) => (
        <fieldset key={group.prefix} className="flex flex-col gap-3">
          <legend className="text-base font-semibold">{group.title}</legend>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {COUNTERS.map((counter) => (
              <TextField
                key={counter.suffix}
                name={`${group.prefix}${counter.suffix}`}
                label={`${counter.label} (${group.title.toLowerCase()})`}
                type="number"
                min="0"
                inputMode="numeric"
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
