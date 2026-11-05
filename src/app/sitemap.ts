import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCachedSitemapEntries } from "@/features/seo/cached-queries";
import { requestHost } from "@/lib/admin-routing";
import { adminOrigin } from "@/lib/site-urls";

// Solo el sitio tiene sitemap: en el dominio del panel no existe.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (requestHost(await headers()) === new URL(adminOrigin()).host) notFound();
  return getCachedSitemapEntries();
}
