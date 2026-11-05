import type { Metadata } from "next";
import { ogImage, pageMetadata, type OgImage, type PageMetadataInput } from "@/domain/seo";
import { getCachedShareImage } from "@/features/settings/cached-queries";
import { siteOrigin } from "@/lib/site-urls";

/** La imagen de marca para compartir: la de Configuración (variante de 1200 px) o, sin ella, `public/og-default.jpg`. */
export async function getBrandOgImage(): Promise<OgImage> {
  return ogImage(await getCachedShareImage(), siteOrigin());
}

/** `pageMetadata` con la imagen de marca por defecto; solo una noticia con portada trae la suya. */
export async function sitePageMetadata(input: Omit<PageMetadataInput, "ogImage"> & { ogImage?: OgImage }): Promise<Metadata> {
  return pageMetadata({ ...input, ogImage: input.ogImage ?? (await getBrandOgImage()) });
}
