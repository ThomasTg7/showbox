import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { createEventAction } from "@/features/events/actions";
import { EventForm } from "@/features/events/components/event-form";
import { EMPTY_EVENT_VALUES } from "@/features/events/form-values";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Nuevo evento" };

export default async function AdminNuevoEventoPage() {
  await requireAdmin();

  return (
    <AdminPage title="Nuevo evento">
      <EventForm action={createEventAction} defaults={EMPTY_EVENT_VALUES} publication={{ status: "draft", publishAt: null }} isEdit={false} />
    </AdminPage>
  );
}
