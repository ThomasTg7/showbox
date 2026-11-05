import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { Pagination } from "@/components/admin/pagination";
import { db } from "@/db";
import { listAdminSponsors } from "@/features/sponsors/queries";
import { SponsorsManager } from "@/features/sponsors/components/sponsors-manager";
import { parsePageParam } from "@/lib/pagination";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Patrocinadores" };

export default async function AdminPatrocinadoresPage({ searchParams }: PageProps<"/admin/patrocinadores">) {
  await requireAdmin();
  const { pagina } = await searchParams;
  const page = parsePageParam(pagina);
  const { items, hasMore } = await listAdminSponsors(db, {}, { page });

  return (
    <AdminPage title="Patrocinadores">
      <p className="max-w-prose text-muted-foreground">
        Las marcas que apoyan a la promotora. Aparecen en la home, en la página de sus eventos y en el pie de página según su nivel, y se ocultan solas al terminar su vigencia.
        Arrastra (o usa las flechas) para cambiar el orden dentro de cada nivel.
      </p>
      <SponsorsManager sponsors={items} />
      <Pagination basePath={adminPath("/patrocinadores")} page={page} hasMore={hasMore} />
    </AdminPage>
  );
}
