import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { requestHost } from "@/lib/admin-routing";
import { robotsRules } from "@/features/seo/robots-rules";
import { adminOrigin, siteOrigin } from "@/lib/site-urls";

// El proxy no toca los archivos con extensión: `robots.txt` llega por los dos dominios y responde según el que pidió el robot.
export default async function robots(): Promise<MetadataRoute.Robots> {
  return robotsRules({
    host: requestHost(await headers()),
    siteUrl: siteOrigin(),
    adminHost: new URL(adminOrigin()).host,
    allowIndexing: process.env.ALLOW_INDEXING === "true",
  });
}
