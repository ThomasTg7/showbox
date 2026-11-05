"use client";

import { ChevronDown } from "lucide-react";
import { createContext, useContext, useId, useState, type MouseEvent, type ReactNode } from "react";

const AccordionContext = createContext<{ openId: string | null; toggle: (id: string) => void } | null>(null);

/** Agrupa las peleas de la cartelera: solo una muestra sus datos a la vez (abrir otra cierra la anterior). */
export function BoutAccordion({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return <AccordionContext.Provider value={{ openId, toggle: (id) => setOpenId((current) => (current === id ? null : id)) }}>{children}</AccordionContext.Provider>;
}

type BoutItemProps = {
  boutId: string;
  /** «Pérez vs Soto»: nombra el botón para lectores de pantalla. */
  label: string;
  className?: string;
  /** Lo que se ve siempre (armado por el servidor) y lo que se despliega. */
  summary: ReactNode;
  details: ReactNode;
};

/**
 * Una pelea de la cartelera que se despliega al tocarla. El panel se anima con el alto de la fila (0fr → 1fr) y se
 * desvanece; con «reducir movimiento» cambia sin transición. Cerrado queda `inert`: nada de adentro recibe foco.
 * Tocar un enlace del resumen (la ficha de un boxeador, el video) no lo abre.
 */
export function BoutItem({ boutId, label, className, summary, details }: BoutItemProps) {
  const context = useContext(AccordionContext);
  const panelId = useId();
  if (!context) throw new Error("BoutItem va dentro de BoutAccordion");
  const open = context.openId === boutId;

  function handleSummaryClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) return;
    context!.toggle(boutId);
  }

  return (
    <li data-bout={boutId} data-open={open} className={className}>
      <div onClick={handleSummaryClick} className="cursor-pointer">
        {summary}
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => context.toggle(boutId)}
        className="mx-auto mt-3 flex min-h-11 items-center gap-2 px-4 font-cond text-xs font-extrabold uppercase tracking-[.14em] text-neutral-600 transition-opacity hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <span className="sr-only">{label}: </span>
        {open ? "Ocultar datos" : "Ver datos"}
        <ChevronDown aria-hidden className={`size-4 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">{details}</div>
      </div>
    </li>
  );
}
