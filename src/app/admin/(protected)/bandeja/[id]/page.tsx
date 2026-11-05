import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { InboxDetail } from "@/features/inbox/components/inbox-detail";
import { getInboxMessage } from "@/features/inbox/queries";
import { inboxIdSchema } from "@/features/inbox/schema";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Mensaje de la bandeja" };

export default async function AdminInboxMessagePage({ params }: PageProps<"/admin/bandeja/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const parsed = inboxIdSchema.safeParse(id);
  const message = parsed.success ? await getInboxMessage(db, parsed.data) : null;
  if (!message) notFound();

  return (
    <AdminPage
      title={message.name}
      actions={
        <Button asChild variant="outline">
          <Link href={adminPath("/bandeja")}>Volver a la bandeja</Link>
        </Button>
      }
    >
      <InboxDetail message={message} />
    </AdminPage>
  );
}
