import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { db } from "@/db";
import { articleJsonLd, ogImage } from "@/domain/seo";
import { PreviewBanner } from "@/features/fighters/components/preview-banner";
import { getCachedPublicPost } from "@/features/posts/cached-queries";
import { PostArticle } from "@/features/posts/components/post-article";
import { getPublicPostBySlug } from "@/features/posts/queries";
import { verifyPreviewToken } from "@/features/publication/preview";
import { getBrandOgImage, sitePageMetadata } from "@/features/seo/site-metadata";
import { publicUrl, siteOrigin } from "@/lib/site-urls";

/**
 * Con un token de vista previa válido para esta noticia se muestra aunque sea borrador (sin caché); en cualquier otro
 * caso, solo si es pública ahora. Se comparte entre la página y `generateMetadata`.
 */
const loadPost = cache(async (slug: string, previewToken: string | undefined) => {
  // La firma y la fecha se revisan antes de leer: un `?preview=` inventado no cuesta una consulta sin caché.
  if (previewToken && verifyPreviewToken(previewToken)) {
    const draft = await getPublicPostBySlug(db, slug, { preview: true });
    if (draft && verifyPreviewToken(previewToken, { entity: "post", id: draft.id })) {
      return { post: draft, isPreview: true };
    }
  }
  return { post: await getCachedPublicPost(slug), isPreview: false };
});

function previewParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { post, isPreview } = await loadPost(slug, previewParam(query.preview));
  if (!post) return { title: "Noticia no encontrada" };

  return sitePageMetadata({
    title: post.title,
    description: post.excerpt ?? `${post.category.name}: ${post.title}`,
    path: `/noticias/${post.slug}`,
    noindex: isPreview,
    // La portada (16:9, variante de 1600 px) es la imagen para compartir; sin portada, la de marca.
    ...(post.cover ? { ogImage: ogImage(post.cover, siteOrigin(), 1600) } : {}),
    article: { publishedTime: post.date, modifiedTime: post.updatedAt, section: post.category.name },
  });
}

export default async function PostPage({ params, searchParams }: PageProps<"/noticias/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { post, isPreview } = await loadPost(slug, previewParam(query.preview));
  if (!post) notFound();
  const brandImage = await getBrandOgImage();

  return (
    <article>
      {/* Aquí y no dentro de `PostArticle`: así la vista previa en vivo del panel no lo dibuja. Un borrador en vista previa tampoco. */}
      {isPreview ? null : <JsonLd data={articleJsonLd(post, siteOrigin(), brandImage.url)} />}
      <PostArticle post={post} shareUrl={publicUrl(`/noticias/${post.slug}`)} />
      {isPreview ? <PreviewBanner subject="esta noticia" /> : null}
    </article>
  );
}
