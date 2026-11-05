import type { Metadata } from "next";
import { AuthCard } from "@/components/admin/auth-card";
import { RecoverPasswordForm } from "@/features/admin-users/components/recover-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Escribe el correo con el que entras al panel y te enviaremos un enlace."
    >
      <RecoverPasswordForm />
    </AuthCard>
  );
}
