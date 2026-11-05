import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { analyticsConfig, type AnalyticsConfig } from "@/lib/analytics-config";

/**
 * Analítica sin cookies, según `ANALYTICS_PROVIDER`. Va solo en el layout del sitio (nunca en el panel). Se decide al
 * construir: las páginas estáticas llevan el script (o no) en su HTML, así que cambiar de proveedor pide un nuevo deploy.
 * Vercel Analytics no se carga en la página: su componente cliente solo se envía al navegador cuando este lo dibuja.
 */
export function Analytics({ config = analyticsConfig(process.env) }: { config?: AnalyticsConfig }) {
  if (config.provider === "vercel") return <VercelAnalytics />;
  if (config.provider === "umami") return <script defer src={config.src} data-website-id={config.websiteId} />;
  return null;
}
