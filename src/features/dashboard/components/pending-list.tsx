import Link from "next/link";
import { formatDateTime } from "@/lib/format-date";
import { adminPath } from "@/lib/site-urls";
import type { DashboardItem, DashboardItemType, DashboardScheduledItem } from "../queries";

const TYPE_LABELS: Record<DashboardItemType, string> = { fighter: "Boxeador", event: "Evento", post: "Noticia" };

/** La pantalla de edición de cada tipo (las rutas del panel van sin `/admin`). */
function editHref(item: DashboardItem): string {
  switch (item.type) {
    case "fighter":
      return adminPath(`/boxeadores/${item.id}`);
    case "event":
      return adminPath(`/eventos/${item.id}`);
    case "post":
      return adminPath(`/noticias/${item.id}`);
  }
}

type PendingListProps = {
  title: string;
  /** Qué falta para que salgan: «Publícalos cuando estén listos». */
  hint: string;
  emptyText: string;
  items: (DashboardItem | DashboardScheduledItem)[];
};

/** Lista corta de borradores o de programados: cada elemento lleva a su edición; los programados dicen cuándo se publican. */
export function PendingList({ title, hint, emptyText, items }: PendingListProps) {
  const headingId = `pending-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="sb-admin-section flex flex-col gap-3 p-5 sm:p-6">
      <div>
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`} className="border-b border-border last:border-b-0">
              <Link href={editHref(item)} className="flex min-h-11 flex-col justify-center gap-0.5 py-2 hover:text-accent-bright focus-visible:outline-2 focus-visible:outline-accent-bright">
                <span className="break-words font-medium">{item.title}</span>
                <span className="text-sm text-muted-foreground">
                  {TYPE_LABELS[item.type]}
                  {"publishAt" in item ? ` · se publica el ${formatDateTime(item.publishAt)}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
