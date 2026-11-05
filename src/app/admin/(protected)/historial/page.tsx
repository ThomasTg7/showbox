import { adminPath } from "@/lib/site-urls";
import type { Metadata } from "next";
import { db } from "@/db";
import { AdminPage } from "@/components/admin/admin-page";
import { Pagination } from "@/components/admin/pagination";
import { AuditLogList } from "@/features/audit/components/audit-log-list";
import { listAuditLog } from "@/features/audit/queries";
import { parsePageParam } from "@/lib/pagination";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Historial" };

export default async function AdminHistorialPage({ searchParams }: PageProps<"/admin/historial">) {
  await requireAdmin();
  const page = parsePageParam((await searchParams).pagina);
  const { entries, hasMore } = await listAuditLog(db, { page });

  return (
    <AdminPage title="Historial">
      <AuditLogList entries={entries} />
      <Pagination basePath={adminPath("/historial")} page={page} hasMore={hasMore} />
    </AdminPage>
  );
}
