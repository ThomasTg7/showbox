import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { Pagination } from "@/components/admin/pagination";
import { db } from "@/db";
import { InboxFiltersBar, KIND_PARAMS, STATUS_PARAMS } from "@/features/inbox/components/inbox-filters";
import { InboxList } from "@/features/inbox/components/inbox-list";
import { listInbox } from "@/features/inbox/queries";
import { parsePageParam } from "@/lib/pagination";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Bandeja" };

const text = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function AdminBandejaPage({ searchParams }: PageProps<"/admin/bandeja">) {
  await requireAdmin();
  const query = await searchParams;
  const kindParam = Object.hasOwn(KIND_PARAMS, text(query.tipo)) ? text(query.tipo) : "";
  const statusParam = Object.hasOwn(STATUS_PARAMS, text(query.estado)) ? text(query.estado) : "";
  const page = parsePageParam(query.pagina);
  const { items, hasMore } = await listInbox(db, { kind: KIND_PARAMS[kindParam], status: STATUS_PARAMS[statusParam] }, { page });

  return (
    <AdminPage title="Bandeja">
      <p className="max-w-prose text-muted-foreground">
        Las postulaciones «Quiero pelear» y los contactos de patrocinio que llegan desde el sitio. Ábrelos para responder por correo o WhatsApp y márcalos como contactados.
      </p>
      <InboxFiltersBar kindParam={kindParam} statusParam={statusParam} />
      <InboxList items={items} filtered={Boolean(kindParam || statusParam)} />
      <Pagination basePath={adminPath("/bandeja")} page={page} hasMore={hasMore} params={{ tipo: kindParam, estado: statusParam }} />
    </AdminPage>
  );
}
