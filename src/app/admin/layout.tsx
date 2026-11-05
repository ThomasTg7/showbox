import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { template: `%s · Panel ${BRAND.name}`, default: `Panel ${BRAND.name}` },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
