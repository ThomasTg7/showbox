"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FightCardTabsProps = {
  /** Un bloque por pestaña; su lista de peleas ya viene armada por el servidor. */
  segments: { id: string; name: string; content: ReactNode }[];
};

/**
 * Pestañas por bloque de la cartelera («Cartelera estelar», «Preliminares»…) sobre fondo blanco. Solo las pestañas son
 * interactivas; el contenido lo arma el servidor. Cada pestaña es roja con texto blanco y la
 * activa pasa a negro con texto rojo ShowBox; la entrada del panel usa solo `transform` y `opacity` y se queda quieta si la
 * persona pidió menos movimiento. Con un solo bloque no hay pestañas.
 */
export function FightCardTabs({ segments }: FightCardTabsProps) {
  const [active, setActive] = useState(segments[0]?.id ?? "");
  if (segments.length === 1) {
    const [only] = segments;
    return (
      <div>
        <h3 className="border-b-2 border-neutral-200 py-3.5 font-cond text-[15px] font-extrabold uppercase tracking-[.1em] text-black">{only!.name}</h3>
        <ul className="flex flex-col gap-4 md:gap-5">{only!.content}</ul>
      </div>
    );
  }

  return (
    <Tabs value={active} onValueChange={setActive} className="gap-0">
      <TabsList variant="line" className="mb-2 h-auto w-full flex-wrap justify-start gap-2 p-0 group-data-horizontal/tabs:h-auto">
        {segments.map((segment) => (
          <TabsTrigger
            key={segment.id}
            value={segment.id}
            className="h-auto min-h-11 flex-none rounded-none border-2 border-brand bg-brand! px-5 py-2.5 font-cond text-[15px] font-extrabold uppercase tracking-[.1em] text-white! transition-opacity duration-300 after:hidden hover:bg-black/85! hover:text-brand! data-active:bg-black! data-active:text-brand! motion-reduce:transition-none"
          >
            {segment.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {segments.map((segment) => (
        // Todos los bloques quedan en el HTML (ocultos los que no se ven): buscadores y lectores los encuentran sin JavaScript.
        <TabsContent
          key={segment.id}
          value={segment.id}
          forceMount
          hidden={active !== segment.id}
          className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
        >
          <ul className="flex flex-col gap-4 md:gap-5">{segment.content}</ul>
        </TabsContent>
      ))}
    </Tabs>
  );
}
