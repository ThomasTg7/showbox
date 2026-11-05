import Link from "next/link";
import { Button } from "@/components/ui-gc/button";

export default function EventNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 pb-16 pt-32 text-center">
      <h1 className="font-display text-[clamp(30px,8vw,88px)] uppercase leading-[.9] text-white">Evento no encontrado</h1>
      <p className="max-w-md font-cond uppercase tracking-[.08em] text-muted-foreground">
        Ese evento no existe o todavía no es público. Revisa el enlace o mira todos los eventos.
      </p>
      <Button variant="primary" asChild>
        <Link href="/eventos">Ver eventos</Link>
      </Button>
    </div>
  );
}
