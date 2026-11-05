import type { MetadataRoute } from "next";

type RobotsInput = {
  /** Dominio que pidió el robot (`requestHost`). */
  host: string;
  /** Origen del sitio público (`SITE_URL`). */
  siteUrl: string;
  /** Dominio del panel (`ADMIN_URL`). */
  adminHost: string;
  /** `ALLOW_INDEXING=true`: el sitio ya se lanzó. */
  allowIndexing: boolean;
};

const CLOSED: MetadataRoute.Robots = { rules: { userAgent: "*", disallow: "/" } };

/**
 * `robots.txt` según el dominio. El panel siempre cerrado. El sitio, abierto salvo `/admin` y `/api`; pero el subdominio de
 * prueba `*.vercel.app` queda cerrado hasta el lanzamiento (`ALLOW_INDEXING=true`) para que Google no lo indexe antes.
 */
export function robotsRules({ host, siteUrl, adminHost, allowIndexing }: RobotsInput): MetadataRoute.Robots {
  if (host === adminHost) return CLOSED;
  if (new URL(siteUrl).hostname.endsWith(".vercel.app") && !allowIndexing) return CLOSED;
  return { rules: { userAgent: "*", disallow: ["/admin", "/api"] }, sitemap: `${siteUrl}/sitemap.xml` };
}
