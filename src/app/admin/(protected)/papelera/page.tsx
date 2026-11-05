import { adminPath } from "@/lib/site-urls";
import type { Metadata } from "next";
import { db } from "@/db";
import { AdminPage } from "@/components/admin/admin-page";
import { Pagination } from "@/components/admin/pagination";
import { TrashManager } from "@/features/trash/components/trash-manager";
import { listTrash } from "@/features/trash/trash";
import { parsePageParam } from "@/lib/pagination";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Papelera" };

export default async function AdminPapeleraPage({ searchParams }: PageProps<"/admin/papelera">) {
  await requireAdmin();
  const page = parsePageParam((await searchParams).pagina);
  const { items, hasMore } = await listTrash(db, { page });

  return (
    <AdminPage title="Papelera">
      <TrashManager items={items} />
      <Pagination basePath={adminPath("/papelera")} page={page} hasMore={hasMore} />
    </AdminPage>
  );
}
