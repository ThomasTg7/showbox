import { ClipboardList, Radio } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { createEventPreviewLinkAction, updateEventAction } from "@/features/events/actions";
import { getEventForEdit } from "@/features/events/admin-queries";
import { EventForm } from "@/features/events/components/event-form";
import { eventToFormValues } from "@/features/events/form-values";
import { eventIdSchema } from "@/features/events/schema";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Editar evento" };

export default async function AdminEditarEventoPage({ params, searchParams }: PageProps<"/admin/eventos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!eventIdSchema.safeParse(id).success) notFound();
  const [edit, query] = await Promise.all([getEventForEdit(db, id), searchParams]);
  if (!edit) notFound();

  const { event, heroMedia, heroMobileMedia, posterMedia, gallery } = edit;
  return (
    <AdminPage
      title={event.name}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath(`/eventos/${event.id}/cartelera`)}>
              <ClipboardList aria-hidden /> Cartelera
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={adminPath(`/eventos/${event.id}/en-vivo`)}>
              <Radio aria-hidden /> Noche de pelea
            </Link>
          </Button>
        </div>
      }
    >
      <EventForm
        action={updateEventAction.bind(null, event.id)}
        defaults={eventToFormValues(event)}
        heroMedia={heroMedia}
        heroMobileMedia={heroMobileMedia}
        posterMedia={posterMedia}
        gallery={gallery}
        tiers={event.ticketTiers}
        watchPlatforms={edit.watchPlatforms}
        publication={{ status: event.status, publishAt: event.publishAt }}
        previewHref={createEventPreviewLinkAction.bind(null, event.id)}
        isEdit
        isLive={event.eventStatus === "live"}
        justCreated={query.creado === "1"}
      />
    </AdminPage>
  );
}
