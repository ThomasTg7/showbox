import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import { archivo, montserrat } from "./fonts";
import "./globals.css";
import "./showbox-public.css";
import "./showbox-admin.css";
import "./showbox-motion.css";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-EC"
      className={`${archivo.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
