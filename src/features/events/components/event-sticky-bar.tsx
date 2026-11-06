"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui-gc/button";

type EventStickyBarProps = {
  name: string;
  /** «sáb 24 oct · 21:00 hrs · Quorum Paseo San Francisco». */
  meta: string;
  /** Enlace de «Entradas»; sin él (evento pasado o cancelado) la barra no lleva botón. */
  ticketHref?: string;
  /** `true` si `ticketHref` sale del sitio (la ticketera). */
  external?: boolean;
  /** `id` del hero: la barra aparece cuando ya se pasó de largo. */
  heroId: string;
};

/**
 * Barra fija con el nombre, la fecha, el lugar y las entradas, que aparece al pasar el hero (en celular abajo, en
 * escritorio arriba). Mientras no se ve queda `inert`: sus enlaces no reciben foco. Solo `transform`.
 */
export function EventStickyBar({ name, meta, ticketHref, external = false, heroId }: EventStickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    if (!hero) return;
    // Visible solo cuando el hero quedó arriba (se hizo scroll más allá de él), no cuando aún está por llegar.
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry?.isIntersecting && (entry?.boundingClientRect.bottom ?? 1) <= 0));
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroId]);

  return (
    <div
      data-slot="event-sticky-bar"
      data-visible={visible}
      // `inert`: oculta a lectores de pantalla y saca del orden de foco lo que no se ve.
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-[99] border-t border-border bg-surface transition-transform duration-[450ms] ease-sb motion-reduce:transition-none md:inset-x-3 md:bottom-auto md:top-[76px] md:mx-auto md:max-w-[1240px] md:rounded-lg md:border lg:inset-x-6 lg:top-[88px] ${
        visible ? "translate-y-0" : "translate-y-full md:-translate-y-[calc(100%+88px)]"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center gap-4 px-[clamp(16px,4vw,64px)] md:h-14 md:gap-6">
        <div className="min-w-0 flex-1 md:flex md:items-baseline md:gap-6">
          <p className="truncate font-display text-lg uppercase leading-tight text-white md:text-[22px]">{name}</p>
          <p className="truncate font-cond text-[13px] font-semibold uppercase tracking-[.06em] text-muted-foreground md:text-sm">{meta}</p>
        </div>
        {ticketHref ? (
          <Button variant="primary" asChild className="px-[18px] py-[9px] text-[13px]">
            {external ? (
              <a href={ticketHref} target="_blank" rel="noopener noreferrer">
                Entradas
              </a>
            ) : (
              <a href={ticketHref}>Entradas</a>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
