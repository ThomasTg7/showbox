"use client";

import { Button } from "@/components/ui/button";

type LiveNightGateProps = {
  eventName: string;
  /** Cuándo es el evento, ya escrito («sábado 24 de octubre, 21:00»). */
  startsLabel: string;
  onOpen: () => void;
};

/** Antes de la noche del evento, abrir la consola no lo pone en vivo: hay que decirlo con un botón. */
export function LiveNightGate({ eventName, startsLabel, onOpen }: LiveNightGateProps) {
  return (
    <section aria-label="La noche aún no empieza" className="flex flex-col gap-3 border border-border bg-card p-5">
      <p className="font-display text-2xl uppercase">La noche de pelea aún no empieza</p>
      <p className="text-sm text-muted-foreground">
        {eventName} es el {startsLabel}. Al abrir la noche el evento aparece «EN VIVO» en el sitio: hazlo cuando vaya a comenzar.
      </p>
      <Button type="button" className="min-h-12 self-start px-5 text-base" onClick={onOpen}>
        Abrir la noche de pelea
      </Button>
    </section>
  );
}
