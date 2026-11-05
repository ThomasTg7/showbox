import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { MyNameForm, MyPasswordForm } from "@/features/admin-users/components/my-account-forms";
import { getMyAccount } from "@/features/admin-users/my-account";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function MyAccountPage() {
  const admin = await requireAdmin();
  const account = await getMyAccount(db, admin.userId);
  if (!account) notFound();

  return (
    <AdminPage title="Mi cuenta">
      <div className="flex max-w-4xl flex-col gap-6">
        <MyNameForm name={account.name} email={account.email} />
        <MyPasswordForm hasPassword={account.hasPassword} hasGoogle={account.hasGoogle} />
      </div>
    </AdminPage>
  );
}
