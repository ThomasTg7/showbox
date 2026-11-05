import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ArenaBackdrop } from "@/components/brand/arena-backdrop";
import { BrandMark } from "@/components/brand/brand-mark";
import { BRAND } from "@/domain/brand";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className="sb-admin relative isolate min-h-svh flex items-center justify-center overflow-hidden bg-background px-4 py-10">
      <ArenaBackdrop />
      <BrandMark className="absolute -right-28 top-0 -z-10 h-full opacity-50 md:right-[10%]" />
      <div className="sb-admin-section w-full max-w-md flex flex-col gap-6 border-t-4 border-t-brand-bright bg-black/70 backdrop-blur-sm p-6 sm:p-10">
        <div className="flex justify-center">
          <Logo size="lg" priority className="w-[min(260px,70vw)]" />
        </div>
        <div className="flex flex-col gap-2 text-center">
          <p className="font-cond text-xs font-bold uppercase tracking-[.2em] text-accent-bright">{BRAND.name} · Administración</p>
          <h1 className="sb-admin-title">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </div>
    </main>
  );
}
