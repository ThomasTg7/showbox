import type { Metadata } from "next";
import { db } from "@/db";
import { AdminPage } from "@/components/admin/admin-page";
import { AllowedEmailsList } from "@/features/admin-users/components/allowed-emails-list";
import { InviteAdminForm } from "@/features/admin-users/components/invite-admin-form";
import { listAllowedEmails } from "@/features/admin-users/queries";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Usuarios" };

export default async function AdminUsuariosPage() {
  const admin = await requireAdmin();
  const emails = await listAllowedEmails(db);

  return (
    <AdminPage title="Usuarios">
      <p className="text-muted-foreground max-w-prose">
        Estas personas pueden entrar al panel. Al dar acceso, le enviamos un correo para que cree su contraseña;
        también puede entrar con Google si está activado.
      </p>
      <InviteAdminForm />
      <AllowedEmailsList emails={emails} currentEmail={admin.email.toLowerCase()} />
    </AdminPage>
  );
}
