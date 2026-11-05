import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import Link from "next/link";
import { PageEmpty, PageHeader, PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui-gc/button";
import { hasPostBodyContent } from "@/domain/post-body";
import { PostBody } from "@/features/posts/render/post-body";
import { sitePageMetadata } from "@/features/seo/site-metadata";
import { getCachedSetting } from "@/features/settings/cached-queries";

export async function generateMetadata(): Promise<Metadata> {
  const { body } = await getCachedSetting("about");
  return sitePageMetadata({
    title: "Nosotros",
    description: `Conoce a ${BRAND.name}, la promotora de boxeo de Ecuador.`,
    path: "/nosotros",
    // Sin texto la página es un «Pronto…»: no se indexa hasta que la promotora lo escriba.
    noindex: !hasPostBodyContent(body),
  });
}

export default async function NosotrosPage() {
  const { body } = await getCachedSetting("about");

  return (
    <PageShell>
      <PageHeader title="Nosotros" />
      {hasPostBodyContent(body) ? (
        <div className="max-w-[720px]">
          <PostBody doc={body} media={{}} />
        </div>
      ) : (
        <PageEmpty title="Pronto contaremos quiénes somos" text="Estamos preparando esta página.">
          <Button variant="ghost" asChild className="mt-2">
            <Link href="/contacto">Ir a contacto</Link>
          </Button>
        </PageEmpty>
      )}
    </PageShell>
  );
}
