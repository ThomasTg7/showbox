import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { db } from "@/db";
import { listAdminPosts, listCategories, type AdminPostFilters } from "@/features/posts/admin-queries";
import { PostsAdminList } from "@/features/posts/components/posts-admin-list";
import { parsePageParam } from "@/lib/pagination";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Noticias" };

const PUBLICATION_VALUES = ["draft", "scheduled", "published"] as const;

const text = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function AdminNoticiasPage({ searchParams }: PageProps<"/admin/noticias">) {
  await requireAdmin();
  const query = await searchParams;
  const page = parsePageParam(query.pagina);
  const categories = await listCategories(db);
  const category = categories.find((item) => item.slug === text(query.categoria))?.slug;
  const filters: AdminPostFilters = {
    publication: PUBLICATION_VALUES.find((value) => value === text(query.publicacion)),
    category,
    q: text(query.q).trim().slice(0, 80) || undefined,
  };
  const { items, hasMore } = await listAdminPosts(db, filters, { page });

  return (
    <AdminPage
      title="Noticias"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("/noticias/categorias")}>Categorías</Link>
          </Button>
          <Button asChild>
            <Link href={adminPath("/noticias/nueva")}>
              <Plus aria-hidden /> Nueva noticia
            </Link>
          </Button>
        </div>
      }
    >
      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium sm:max-w-xs">
          Buscar por título
          <Input name="q" type="search" defaultValue={filters.q ?? ""} placeholder="Título de la noticia" autoComplete="off" />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm font-medium sm:max-w-48">
          Publicación
          <NativeSelect name="publicacion" defaultValue={filters.publication ?? ""}>
            <option value="">Todas</option>
            <option value="published">Publicadas</option>
            <option value="scheduled">Programadas</option>
            <option value="draft">Borradores</option>
          </NativeSelect>
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm font-medium sm:max-w-48">
          Categoría
          <NativeSelect name="categoria" defaultValue={filters.category ?? ""}>
            <option value="">Todas</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button type="submit">Filtrar</Button>
        <Button asChild variant="outline">
          <Link href={adminPath("/noticias")}>Limpiar</Link>
        </Button>
      </form>
      <PostsAdminList posts={items} hasFilters={Boolean(filters.publication || filters.category || filters.q)} />
      <Pagination basePath={adminPath("/noticias")} page={page} hasMore={hasMore} params={{ q: filters.q ?? "", publicacion: filters.publication ?? "", categoria: filters.category ?? "" }} />
    </AdminPage>
  );
}
