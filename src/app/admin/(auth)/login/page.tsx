import { adminPath } from "@/lib/site-urls";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/auth-card";
import { LoginForm } from "@/features/admin-users/components/login-form";
import { googleSignInEnabled } from "@/lib/auth";
import { getAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Ingresar" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdmin()) {
    redirect(adminPath("/"));
  }

  const { error } = await searchParams;

  return (
    <AuthCard title="Ingresar al panel">
      <LoginForm googleEnabled={googleSignInEnabled} oauthErrorCode={typeof error === "string" ? error : undefined} />
    </AuthCard>
  );
}
