import { FighterFace } from "@/features/fighters/components/fighter-photo";
import { cn } from "@/lib/cn";
import type { AdminBoutFighter } from "../admin-card-queries";

/**
 * Miniatura del boxeador en el panel (listado de boxeadores, cartelera y resultados en vivo): la foto de rostro; si no
 * hay, la de cuerpo recortada desde arriba (se ve la cara); y si no hay ninguna, la silueta. `className` da el tamaño.
 */
export function AdminFighterThumb({ fighter, className }: { fighter: Pick<AdminBoutFighter, "headshotMedia" | "bodyMedia">; className?: string }) {
  return (
    <div className={cn("shrink-0 overflow-hidden bg-muted", className)}>
      <FighterFace fighter={fighter} sizes="64px" silhouetteClassName="size-full text-black drop-shadow-[0_0_1px_rgba(255,59,71,.6)]" />
    </div>
  );
}
