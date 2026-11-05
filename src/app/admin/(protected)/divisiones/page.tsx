import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { DivisionsManager } from "@/features/divisions/components/divisions-manager";
import { listDivisions } from "@/features/divisions/queries";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Divisiones" };

export default async function AdminDivisionesPage() {
  await requireAdmin();
  const divisions = await listDivisions(db);

  return (
    <AdminPage title="Divisiones">
      <p className="max-w-prose text-muted-foreground">
        Las categorías de peso de la promotora. Arrastra (o usa las flechas) para cambiar el orden. Una división
        inactiva no aparece al crear boxeadores nuevos.
      </p>
      <DivisionsManager divisions={divisions} />
    </AdminPage>
  );
}
