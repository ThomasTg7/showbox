import { cn } from "@/lib/cn";

/**
 * El escenario de los afiches ShowBox: humo rojo y negro, focos del techo de la arena y grano de película. Todo es CSS
 * estático (sin JavaScript ni imágenes); los focos titilan con opacidad y se detienen con «reducir movimiento».
 */
export function ArenaBackdrop({ className, lights = true }: { className?: string; lights?: boolean }) {
  return (
    <div aria-hidden className={cn("sb-arena pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className="sb-smoke absolute inset-0" />
      {lights ? <div className="sb-spotlights absolute inset-x-0 top-0 h-[45%]" /> : null}
      <div className="sb-grain absolute inset-0" />
    </div>
  );
}
