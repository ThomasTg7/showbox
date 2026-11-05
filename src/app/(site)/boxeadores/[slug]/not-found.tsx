import Link from "next/link";
import { Button } from "@/components/ui-gc/button";

export default function FighterNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 pb-16 pt-32 text-center">
      <h1 className="font-display text-[clamp(40px,8vw,96px)] uppercase leading-[.9] text-white">Boxeador no encontrado</h1>
      <p className="max-w-md font-cond uppercase tracking-[.08em] text-muted-foreground">
        Esa ficha no existe o todavía no es pública. Revisa el enlace o mira a todo el plantel.
      </p>
      <Button variant="primary" asChild>
        <Link href="/boxeadores">Ver boxeadores</Link>
      </Button>
    </div>
  );
}
