"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatThousands } from "@/lib/format-money";

type MoneyInputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode"> & {
  /** El monto como se ve («15.000»). */
  value: string;
  onChange: (value: string) => void;
};

/** Monto en pesos con «$» delante y el punto de miles puesto mientras se escribe. Leerlo: `parseThousands`. */
export function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
        $
      </span>
      <Input {...props} value={formatThousands(value)} onChange={(event) => onChange(formatThousands(event.target.value))} inputMode="numeric" autoComplete="off" className={cn("pl-7 tabular-nums", className)} />
    </div>
  );
}
