import { adminPath } from "@/lib/site-urls";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { listDivisions } from "@/features/divisions/queries";
import { FightersAdminFilters } from "@/features/fighters/components/fighters-admin-filters";
import { FightersAdminList } from "@/features/fighters/components/fighters-admin-list";
import { listAdminFighters, type AdminFighterFilters } from "@/features/fighters/admin-queries";
import { parsePageParam } from "@/lib/pagination";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Boxeadores" };

const PUBLICATION_VALUES = ["draft", "scheduled", "published"] as const;
const CAREER_VALUES = ["active", "inactive", "retired"] as const;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return allowed.find((option) => option === value);
}

export default async function AdminBoxeadoresPage({ searchParams }: PageProps<"/admin/boxeadores">) {
  await requireAdmin();
  const query = await searchParams;
  const values = { q: single(query.q), division: single(query.division), publicacion: single(query.publicacion), estado: single(query.estado) };
  const page = parsePageParam(query.pagina);

  const filters: AdminFighterFilters = {
    q: values.q || undefined,
    division: values.division || undefined,
    publication: oneOf(values.publicacion, PUBLICATION_VALUES),
    status: oneOf(values.estado, CAREER_VALUES),
  };
  const [{ items, hasMore }, divisions] = await Promise.all([listAdminFighters(db, filters, { page }), listDivisions(db)]);
  const hasFilters = Object.values(values).some(Boolean);

  return (
    <AdminPage
      title="Boxeadores"
      actions={
        <Button asChild>
          <Link href={adminPath("/boxeadores/nuevo")}>
            <Plus aria-hidden /> Nuevo boxeador
          </Link>
        </Button>
      }
    >
      <FightersAdminFilters divisions={divisions} values={values} />
      <FightersAdminList fighters={items} hasFilters={hasFilters} />
      <Pagination basePath={adminPath("/boxeadores")} page={page} hasMore={hasMore} params={values} />
    </AdminPage>
  );
}
