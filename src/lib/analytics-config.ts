import { isHttpUrl } from "./zod-fields";

export type AnalyticsConfig = { provider: "none" } | { provider: "vercel" } | { provider: "umami"; src: string; websiteId: string };

const WEBSITE_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Qué analítica carga el sitio según el entorno. Siempre sin cookies (no hay banner): `vercel` (Vercel Analytics), `umami`
 * (autoalojado: `UMAMI_SRC` + `UMAMI_WEBSITE_ID`) o nada. Cualquier valor raro o incompleto es «nada»: una mala variable
 * nunca debe romper el sitio ni cargar un script que no se entiende.
 */
export function analyticsConfig(env: Record<string, string | undefined>): AnalyticsConfig {
  const provider = env.ANALYTICS_PROVIDER?.trim().toLowerCase();
  if (provider === "vercel") return { provider };
  if (provider === "umami") {
    const src = env.UMAMI_SRC?.trim() ?? "";
    const websiteId = env.UMAMI_WEBSITE_ID?.trim() ?? "";
    if (isHttpUrl(src) && WEBSITE_ID.test(websiteId)) return { provider, src, websiteId };
  }
  return { provider: "none" };
}
