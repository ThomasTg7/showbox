"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { countdownParts } from "../public-format";

type CountdownProps = {
  /** Hora del evento como texto ISO (`unstable_cache` no conserva `Date`). */
  target: string;
  className?: string;
};

function subscribe(onTick: () => void): () => void {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

const getSnapshot = (): number | null => Math.floor(Date.now() / 1000);
// El servidor no conoce la hora del navegador: su HTML trae guiones y la cuenta aparece al hidratar (nunca `Date.now()` en el render).
const getServerSnapshot = (): number | null => null;

const CELLS = [
  { key: "days", label: "DÍAS" },
  { key: "hours", label: "HRS" },
  { key: "minutes", label: "MIN" },
  { key: "seconds", label: "SEG" },
] as const;

const two = (value: number) => String(value).padStart(2, "0");

/**
 * Cuenta regresiva a la hora del evento. La fecha escrita ya está en la página: esto solo suma el reloj. Al llegar a cero
 * dice «EN VIVO»: a su hora el evento pasa solo a en vivo (`effectiveEventStatus`), y solo se muestra en uno programado o en vivo.
 */
export function Countdown({ target, className }: CountdownProps) {
  const nowSeconds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const parts = nowSeconds === null ? null : countdownParts(new Date(target).getTime() - nowSeconds * 1000);

  if (nowSeconds !== null && parts === null) {
    return (
      <p className="inline-flex items-center gap-2 bg-red px-4 py-2 font-cond text-lg font-extrabold uppercase tracking-[.14em] text-white">
        <span aria-hidden className="size-2.5 rounded-full bg-white motion-safe:animate-pulse" />
        EN VIVO
      </p>
    );
  }

  return (
    <div role="timer" aria-label="Cuenta regresiva" className={cn("flex justify-center gap-1", className)}>
      {CELLS.map(({ key, label }) => (
        <div key={key} className="min-w-[68px] border border-border bg-white/[.04] px-2 pb-2 pt-2.5 text-center backdrop-blur-sm sm:min-w-[82px]">
          <strong data-countdown className="block font-display text-[30px] font-normal leading-none tabular-nums sm:text-[38px]">
            {parts ? two(parts[key]) : "--"}
          </strong>
          <small className="font-cond text-[11px] font-bold tracking-[.14em] text-muted-foreground">{label}</small>
        </div>
      ))}
    </div>
  );
}
