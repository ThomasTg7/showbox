import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { listCategories } from "@/features/posts/admin-queries";
import { CategoriesManager } from "@/features/posts/components/categories-manager";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Categorías de noticias" };

export default async function AdminCategoriasPage() {
  await requireAdmin();
  const categories = await listCategories(db);

  return (
    <AdminPage
      title="Categorías de noticias"
      actions={
        <Button asChild variant="outline">
          <Link href={adminPath("/noticias")}>Volver a noticias</Link>
        </Button>
      }
    >
      <p className="max-w-2xl text-sm text-muted-foreground">
        Las categorías agrupan las noticias y son los filtros del sitio. Puedes agregar nuevas, cambiarles el nombre y ordenarlas; una categoría que todavía tiene
        noticias no se puede eliminar.
      </p>
      <CategoriesManager categories={categories} />
    </AdminPage>
  );
}
