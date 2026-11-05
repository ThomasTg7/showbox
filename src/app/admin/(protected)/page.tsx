import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { InboxCard } from "@/features/dashboard/components/inbox-card";
import { NextEventCard } from "@/features/dashboard/components/next-event-card";
import { PendingList } from "@/features/dashboard/components/pending-list";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { getDashboard } from "@/features/dashboard/queries";
import { RankingWarnings } from "@/features/rankings/components/ranking-warnings";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Inicio" };

export default async function AdminHomePage() {
  await requireAdmin();
  const dashboard = await getDashboard(db);

  return (
    <AdminPage title="Inicio">
      <QuickActions />
      {/* En celular todo va en una columna con la bandeja justo bajo el evento; en PC, dos columnas. */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-1 lg:order-none">
            <NextEventCard event={dashboard.nextEvent} />
          </div>
          <div className="order-4 lg:order-none">
            <PendingList title="Programados" hint="Se publican solos en su fecha." emptyText="No hay nada programado." items={dashboard.scheduled} />
          </div>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-2 lg:order-none">
            <InboxCard count={dashboard.newInbox} />
          </div>
          <div className="order-3 lg:order-none">
            <PendingList title="Borradores" hint="Aún no se ven en el sitio. Publícalos cuando estén listos." emptyText="No tienes borradores." items={dashboard.drafts} />
          </div>
        </div>
      </div>
      {dashboard.rankingWarnings.length > 0 ? (
        <div className="flex flex-col items-start gap-3">
          <RankingWarnings warnings={dashboard.rankingWarnings} />
          <Link href={adminPath("/rankings")} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 hover:text-accent-bright">
            Ir a Rankings y títulos
          </Link>
        </div>
      ) : null}
    </AdminPage>
  );
}
