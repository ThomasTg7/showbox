import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminPath } from "@/lib/site-urls";

const ACTIONS = [
  { href: adminPath("/boxeadores/nuevo"), label: "Boxeador" },
  { href: adminPath("/eventos/nuevo"), label: "Evento" },
  { href: adminPath("/noticias/nueva"), label: "Noticia" },
] as const;

/** Lo que más se crea, a un toque desde el inicio. */
export function QuickActions() {
  return (
    <nav aria-label="Accesos rápidos" className="sb-admin-section grid grid-cols-3 gap-2 p-3 sm:flex sm:flex-wrap sm:p-4">
      {ACTIONS.map((action) => (
        <Button key={action.href} asChild variant="outline" size="lg" className="min-w-0 gap-1 px-2 sm:flex-none sm:px-4">
          <Link href={action.href}>
            <Plus aria-hidden /> {action.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
