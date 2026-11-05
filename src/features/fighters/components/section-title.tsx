import type { ReactNode } from "react";

/** Título de las secciones grandes de la ficha (Récord, Historial de peleas): siempre centrado y del mismo tamaño. */
export function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="w-full text-center font-display text-[clamp(40px,7vw,80px)] uppercase leading-none text-white">
      {children}
    </h2>
  );
}
