"use client";

import { Button } from "@/components/ui-gc/button";
import { useTicketsVisibility } from "@/components/site/use-floating-controls";

type EventStickyBarProps = {
  name: string;
  /** «sáb 24 oct · 21:00 hrs · Quorum Paseo San Francisco». */
  meta: string;
  /** Enlace de «Entradas»; sin él (evento pasado o cancelado) la barra no lleva botón. */
  ticketHref?: string;
  /** `true` si `ticketHref` sale del sitio (la ticketera). */
  external?: boolean;
};

/**
 * Barra inferior con el nombre, la fecha, el lugar y las entradas, que aparece al pasar la portada (`CoverMarker`) y se va en reposo.
 * Mientras no se ve queda `inert`: sus enlaces no reciben foco. Solo se animan transform y opacity.
 */
export function EventStickyBar({ name, meta, ticketHref, external = false }: EventStickyBarProps) {
  const { hidden, interactionProps } = useTicketsVisibility();
  const visible = !hidden;

  return (
    <div
      {...interactionProps}
      data-slot="event-sticky-bar"
      data-visible={visible}
      // `inert`: oculta a lectores de pantalla y saca del orden de foco lo que no se ve.
      inert={!visible}
      className="sb-ticket-bar border-t border-white/20 pb-[env(safe-area-inset-bottom)] md:border md:pb-0"
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
