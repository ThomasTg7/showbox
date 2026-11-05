import type { ReactNode } from "react";
import { db } from "@/db";
import { countNewInbox } from "@/features/inbox/queries";
import { requireAdmin } from "@/lib/require-admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { BRAND } from "@/domain/brand";
import { publicUrl } from "@/lib/site-urls";
import { ArrowUpRight } from "lucide-react";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const newInbox = await countNewInbox(db);

  return (
    <SidebarProvider className="sb-admin">
      <AdminSidebar email={admin.email} newInbox={newInbox} />
      <SidebarInset className="bg-[#0d0b10]">
        <header className="sb-admin-toolbar sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
          <SidebarTrigger />
          <span className="min-w-0 flex-1 truncate font-cond text-sm font-semibold uppercase tracking-[.12em]">{BRAND.name}</span>
          <a href={publicUrl("/")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm text-accent-bright underline-offset-4 hover:underline">Ver sitio <ArrowUpRight aria-hidden className="size-4" /></a>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
