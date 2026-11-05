import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { isEventNight } from "@/domain/event-night";
import { getAdminCard } from "@/features/events/admin-card-queries";
import { eventIdSchema } from "@/features/events/schema";
import { LiveConsole } from "@/features/results/components/live-console";
import { splitNightBouts } from "@/features/results/night-order";
import { formatLongDate, formatTime } from "@/lib/format-date";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath, publicUrl } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Noche de pelea" };

export default async function AdminEnVivoPage({ params }: PageProps<"/admin/eventos/[id]/en-vivo">) {
  await requireAdmin();
  const { id } = await params;
  if (!eventIdSchema.safeParse(id).success) notFound();
  const card = await getAdminCard(db, id);
  if (!card) notFound();

  if (card.event.eventStatus === "cancelled") {
    return (
      <AdminPage title={`Noche de pelea: ${card.event.name}`}>
        <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
          Este evento está cancelado. Vuelve a programarlo en su ficha si la noche de pelea sigue en pie.
        </p>
      </AdminPage>
    );
  }

  const startsAt = new Date(card.event.startsAt);
  const { pending, finished, cancelled } = splitNightBouts(card.segments.map((segment) => ({ name: segment.name, bouts: segment.bouts })));

  return (
    <AdminPage title={`Noche de pelea: ${card.event.name}`}>
      <LiveConsole
        eventId={card.event.id}
        eventName={card.event.name}
        eventStatus={card.event.eventStatus}
        isNight={isEventNight(startsAt, new Date())}
        startsLabel={`${formatLongDate(startsAt)}, ${formatTime(startsAt)}`}
        pending={pending}
        finished={finished}
        cancelled={cancelled}
        cardHref={adminPath(`/eventos/${card.event.id}/cartelera`)}
        publicHref={publicUrl(`/eventos/${card.event.slug}`)}
      />
    </AdminPage>
  );
}
