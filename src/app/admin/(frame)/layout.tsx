import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/require-admin";

/** Páginas del panel que se muestran dentro de un `iframe` del propio panel (sin barra lateral ni encabezado). */
export default async function AdminFrameLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}
