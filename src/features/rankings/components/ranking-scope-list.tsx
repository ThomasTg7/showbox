import { Crown, Pencil } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { adminPath } from "@/lib/site-urls";
import type { ScopeOverview } from "../admin-queries";

/** Los alcances de un nivel (libra por libra y cada división) como tarjetas: sirven igual en celular y en computador. */
export function RankingScopeList({ items }: { items: ScopeOverview[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ scope, championName, entryCount, updatedAt, suggestionCount }) => (
        <li key={scope.slug} className="flex flex-col gap-3 border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{scope.label}</h2>
            {suggestionCount > 0 ? <Badge>{suggestionCount === 1 ? "1 sugerencia" : `${suggestionCount} sugerencias`}</Badge> : null}
          </div>
          <div className="flex flex-1 flex-col gap-1 text-sm">
            {championName === undefined ? (
              <p className="text-muted-foreground">Los mejores {scope.slots} sin importar el peso.</p>
            ) : championName === null ? (
              <p className="text-muted-foreground">Título vacante.</p>
            ) : (
              <p className="flex items-center gap-2">
                <Crown aria-hidden className="size-4 text-accent-bright" />
                <span>
                  Campeón: <span className="font-medium">{championName}</span>
                </span>
              </p>
            )}
            <p className="text-muted-foreground">
              {updatedAt ? `${entryCount} de ${scope.slots} puestos · Actualizado ${formatDate(new Date(updatedAt))}` : `Sin ranking todavía (hasta ${scope.slots} puestos)`}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={adminPath(`/rankings/${scope.level}/${scope.slug}`)} aria-label={`Editar el ranking de ${scope.label}`}>
              <Pencil aria-hidden /> Editar ranking
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
