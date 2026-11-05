"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FighterInfoTabsProps = {
  details: ReactNode;
  socials: ReactNode;
};

const TABS = [
  { value: "datos", label: "Datos" },
  { value: "redes", label: "Redes" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

/**
 * Solo las pestañas son interactivas; el contenido de cada una lo arma el servidor. La barra amarilla se desliza
 * entre pestañas y el panel entra desde el lado hacia el que se avanza: solo `transform` y `opacity`, y sin
 * movimiento si la persona pidió reducirlo (`motion-safe`).
 */
export function FighterInfoTabs({ details, socials }: FighterInfoTabsProps) {
  const [tab, setTab] = useState<TabValue>("datos");
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const panels = { datos: details, redes: socials };
  const activeIndex = TABS.findIndex((item) => item.value === tab);

  function select(next: string) {
    const nextIndex = TABS.findIndex((item) => item.value === next);
    setDirection(nextIndex > activeIndex ? "next" : "previous");
    setTab(next as TabValue);
  }

  return (
    <Tabs value={tab} onValueChange={select} className="gap-8">
      <TabsList variant="line" className="relative h-auto w-full max-w-sm group-data-horizontal/tabs:h-auto justify-start gap-0 border-b border-border p-0">
        {TABS.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="h-11 flex-1 px-5 font-cond text-base font-extrabold uppercase tracking-[.12em] text-muted-foreground transition-opacity after:hidden data-active:text-white"
          >
            {item.label}
          </TabsTrigger>
        ))}
        {/* Barra deslizante: mide la mitad del ancho (dos pestañas iguales) y viaja con `translateX`. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px left-0 h-[3px] w-1/2 bg-brand transition-transform duration-300 ease-sb motion-reduce:transition-none"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      </TabsList>
      {TABS.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className={`text-base motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-sb ${
            direction === "next" ? "motion-safe:slide-in-from-right-6" : "motion-safe:slide-in-from-left-6"
          }`}
        >
          {panels[item.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
