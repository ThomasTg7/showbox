import Link from "next/link";
import { Button } from "@/components/ui-gc/button";

export default function PostNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 pb-16 pt-32 text-center">
      <h1 className="font-display text-[clamp(40px,8vw,96px)] uppercase leading-[.9] text-white">Noticia no encontrada</h1>
      <p className="max-w-md font-cond uppercase tracking-[.08em] text-muted-foreground">
        Esa noticia no existe o todavía no es pública. Revisa el enlace o mira todas las noticias.
      </p>
      <Button variant="primary" asChild>
        <Link href="/noticias">Ver noticias</Link>
      </Button>
    </div>
  );
}
