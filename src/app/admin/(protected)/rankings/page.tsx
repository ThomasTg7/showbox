import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import type { BoutLevel } from "@/domain/bout-enums";
import { listScopeOverview } from "@/features/rankings/admin-queries";
import { RankingScopeList } from "@/features/rankings/components/ranking-scope-list";
import { RankingVisibility } from "@/features/rankings/components/ranking-visibility";
import { RankingWarnings } from "@/features/rankings/components/ranking-warnings";
import { isLevelPublic } from "@/features/rankings/visibility";
import { listIneligibleWarnings } from "@/features/rankings/warnings";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Rankings y títulos" };

const LEVELS: { level: BoutLevel; label: string }[] = [
  { level: "pro", label: "Pro" },
  { level: "amateur", label: "Amateur" },
];

export default async function AdminRankingsPage({ searchParams }: PageProps<"/admin/rankings">) {
  await requireAdmin();
  const { nivel } = await searchParams;
  const level: BoutLevel = nivel === "amateur" ? "amateur" : "pro";
  const [overview, warnings, isPublic] = await Promise.all([listScopeOverview(db, level), listIneligibleWarnings(db, { level }), isLevelPublic(db, level)]);

  return (
    <AdminPage title="Rankings y títulos">
      <p className="max-w-prose text-muted-foreground">
        Cada vez que guardas un ranking se crea una versión nueva: el sitio muestra la última y las flechas ▲▼ comparan con la anterior. Elige un ranking para ordenarlo
        y coronar al campeón.
      </p>
      {/* Pestañas como enlaces: el nivel va en la URL y «Atrás» desde el editor vuelve a la misma pestaña. */}
      <nav aria-label="Nivel" className="flex gap-2">
        {LEVELS.map((option) => (
          <Link
            key={option.level}
            href={adminPath(`/rankings?nivel=${option.level}`)}
            aria-current={option.level === level ? "page" : undefined}
            className={`inline-flex min-h-11 items-center border px-5 font-semibold ${option.level === level ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      <RankingVisibility level={level} isPublic={isPublic} />
      <RankingWarnings warnings={warnings} />
      <RankingScopeList items={overview} />
    </AdminPage>
  );
}
