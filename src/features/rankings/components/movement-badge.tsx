import type { Movement } from "@/domain/rankings";

const places = (count: number) => (count === 1 ? "1 puesto" : `${count} puestos`);

/**
 * Movimiento contra la versión anterior del ranking: ▲n (sube), ▼n (baja), NUEVO o —. Los verdes y rojos son los
 * claros (400) para pasar contraste AA sobre el fondo oscuro de la tarjeta; NUEVO va negro sobre amarillo.
 */
export function MovementBadge({ movement }: { movement: Movement }) {
  switch (movement.kind) {
    case "up":
      return (
        <span role="img" aria-label={`Sube ${places(movement.by)}`} className="font-cond text-sm font-extrabold text-green-400">
          ▲{movement.by}
        </span>
      );
    case "down":
      return (
        <span role="img" aria-label={`Baja ${places(movement.by)}`} className="font-cond text-sm font-extrabold text-red-400">
          ▼{movement.by}
        </span>
      );
    case "new":
      return (
        <span role="img" aria-label="Nuevo en el ranking" className="bg-brand px-1.5 py-0.5 font-cond text-[11px] font-extrabold tracking-[.1em] text-white">
          NUEVO
        </span>
      );
    case "same":
      return (
        <span role="img" aria-label="Sin cambios" className="font-cond text-sm font-bold text-muted-foreground">
          —
        </span>
      );
  }
}
