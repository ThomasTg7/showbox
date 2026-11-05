import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { db } from "@/db";
import { listAdminEvents, type AdminEventFilters } from "@/features/events/admin-queries";
import { EventsAdminList } from "@/features/events/components/events-admin-list";
import { parsePageParam } from "@/lib/pagination";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Eventos" };

const PUBLICATION_VALUES = ["draft", "scheduled", "published"] as const;

export default async function AdminEventosPage({ searchParams }: PageProps<"/admin/eventos">) {
  await requireAdmin();
  const query = await searchParams;
  const publicacion = typeof query.publicacion === "string" ? query.publicacion : "";
  const page = parsePageParam(query.pagina);
  const filters: AdminEventFilters = { publication: PUBLICATION_VALUES.find((value) => value === publicacion) };
  const { items, hasMore } = await listAdminEvents(db, filters, { page });

  return (
    <AdminPage
      title="Eventos"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={adminPath("/eventos/nuevo")}>
              <Plus aria-hidden /> Nuevo evento
            </Link>
          </Button>
        </div>
      }
    >
      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium sm:max-w-xs">
          Publicación
          <NativeSelect name="publicacion" defaultValue={filters.publication ?? ""}>
            <option value="">Todos</option>
            <option value="published">Publicados</option>
            <option value="scheduled">Programados</option>
            <option value="draft">Borradores</option>
          </NativeSelect>
        </label>
        <Button type="submit">Filtrar</Button>
        <Button asChild variant="outline">
          <Link href={adminPath("/eventos")}>Limpiar</Link>
        </Button>
      </form>
      <EventsAdminList events={items} hasFilters={Boolean(filters.publication)} />
      <Pagination basePath={adminPath("/eventos")} page={page} hasMore={hasMore} params={{ publicacion: filters.publication ?? "" }} />
    </AdminPage>
  );
}
