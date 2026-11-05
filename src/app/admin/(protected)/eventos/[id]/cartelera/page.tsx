import { Pencil, Radio } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { listDivisions } from "@/features/divisions/queries";
import { getAdminCard } from "@/features/events/admin-card-queries";
import { CardBuilder } from "@/features/events/components/card-builder";
import { eventIdSchema } from "@/features/events/schema";
import { formatDateTime } from "@/lib/format-date";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Cartelera" };

export default async function AdminCarteleraPage({ params }: PageProps<"/admin/eventos/[id]/cartelera">) {
  await requireAdmin();
  const { id } = await params;
  if (!eventIdSchema.safeParse(id).success) notFound();
  const [card, divisions] = await Promise.all([getAdminCard(db, id), listDivisions(db)]);
  if (!card) notFound();

  return (
    <AdminPage
      title={`Cartelera: ${card.event.name}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath(`/eventos/${card.event.id}`)}>
              <Pencil aria-hidden /> Editar evento
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={adminPath(`/eventos/${card.event.id}/en-vivo`)}>
              <Radio aria-hidden /> Noche de pelea
            </Link>
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        {formatDateTime(new Date(card.event.startsAt))}. Arrastra las peleas para ordenarlas (o usa los botones de subir, bajar y «Mover a»). La primera pelea de
        cada bloque es la más importante.
      </p>
      <CardBuilder
        eventId={card.event.id}
        segments={card.segments}
        divisions={divisions}
      />
    </AdminPage>
  );
}
