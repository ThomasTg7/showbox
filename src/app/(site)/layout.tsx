import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@/components/analytics";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { HOME_TITLE, SITE_NAME, TITLE_TEMPLATE } from "@/domain/seo";
import { getBrandOgImage } from "@/features/seo/site-metadata";
import { getCachedSetting } from "@/features/settings/cached-queries";
import { siteOrigin } from "@/lib/site-urls";

/**
 * Lo común de todo el sitio: dominio base (canónicas y `og:image` relativas), plantilla del título, imagen para compartir
 * por defecto y verificación de Google Search Console (lo que se guardó en Configuración → SEO; vacío = no se dibuja).
 * Solo lecturas cacheadas: no vuelve dinámicas a las páginas estáticas.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [seo, brandImage] = await Promise.all([getCachedSetting("seo"), getBrandOgImage()]);
  return {
    metadataBase: new URL(siteOrigin()),
    title: { template: TITLE_TEMPLATE, default: HOME_TITLE },
    openGraph: { siteName: SITE_NAME, locale: "es_EC", type: "website", images: [brandImage] },
    ...(seo.googleVerification ? { verification: { google: seo.googleVerification } } : {}),
  };
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <div className="sb-site flex min-h-svh flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Analytics />
      </div>
    </SmoothScroll>
  );
}
