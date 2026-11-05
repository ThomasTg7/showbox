import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { getMedia } from "@/features/media/queries";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { getAllSettings } from "@/features/settings/queries";
import { isSettingKey } from "@/features/settings/registry";
import { formatDate } from "@/lib/format-date";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Configuración" };

export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/configuracion">) {
  await requireAdmin();
  const { pestana } = await searchParams;
  const settings = await getAllSettings(db);
  const ogMedia = settings.share.ogMediaId ? await getMedia(db, settings.share.ogMediaId) : null;
  const updatedAt = settings.privacy.updatedAt;

  return (
    <AdminPage title="Configuración">
      <p className="max-w-prose text-muted-foreground">
        Textos, contacto y redes del sitio. Cada pestaña se guarda por separado y el cambio se ve en el sitio al instante.
      </p>
      <SettingsForm
        settings={settings}
        ogMedia={ogMedia}
        privacyUpdatedLabel={updatedAt ? formatDate(new Date(updatedAt)) : null}
        initialTab={isSettingKey(pestana) ? pestana : "about"}
      />
    </AdminPage>
  );
}
