import type { ReactNode } from "react";

type AdminPageProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminPage({ title, actions, children }: AdminPageProps) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="sb-admin-title text-foreground">{title}</h1>
        {actions}
      </div>
      {children}
    </div>
  );
}
