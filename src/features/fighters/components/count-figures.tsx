"use client";

import { useRef } from "react";
import { useCountUp } from "@/hooks/use-count-up";

export type CountFigure = { label: string; value: number; accent?: boolean };

type CountFiguresProps = {
  items: CountFigure[];
  className?: string;
  /** Tamaño de las cifras (la tarjeta usa las chicas; la ficha, las del hero). */
  valueClassName?: string;
};

/**
 * Cifras con contador (V-D-E de la tarjeta, cifras del hero de la ficha). El HTML del servidor ya trae los
 * valores finales (legibles sin JavaScript ni animación); al entrar en pantalla cuenta desde 0 salvo que la
 * persona pida menos movimiento.
 */
export function CountFigures({ items, className, valueClassName = "text-[clamp(26px,5vw,36px)]" }: CountFiguresProps) {
  const rootRef = useRef<HTMLDListElement>(null);
  useCountUp(rootRef, items);

  return (
    <dl ref={rootRef} className={className}>
      {items.map((item) => (
        // El término va antes que el valor en el HTML (lectores de pantalla); `flex-col-reverse` pone la cifra arriba.
        <div key={item.label} className="flex flex-col-reverse border-border pt-3.5 text-center [&:not(:first-child)]:border-l">
          <dt className="mt-1 font-cond text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">{item.label}</dt>
          <dd className={`font-display leading-none tabular-nums ${valueClassName} ${item.accent ? "text-accent-bright" : "text-white"}`}>
            <span data-count={item.value}>{item.value}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
