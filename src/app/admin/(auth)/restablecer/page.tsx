import { adminPath } from "@/lib/site-urls";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/admin/auth-card";
import { authErrorMessage } from "@/features/admin-users/auth-errors";
import { ResetPasswordForm } from "@/features/admin-users/components/reset-password-form";

export const metadata: Metadata = { title: "Elegir contraseña" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/admin/restablecer">) {
  const { token, error } = await searchParams;

  if (typeof token !== "string" || typeof error === "string") {
    return (
      <AuthCard title="Enlace no válido">
        <p role="alert" className="text-center">
          {authErrorMessage({ code: typeof error === "string" ? error : "INVALID_TOKEN" }, "El enlace no es válido.")}
        </p>
        <Link href={adminPath("/recuperar")} className="self-center text-sm underline underline-offset-4">
          Pedir un enlace nuevo
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Elige tu contraseña">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
