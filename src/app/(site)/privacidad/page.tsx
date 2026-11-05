import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import { PageEmpty, PageHeader, PageShell } from "@/components/site/page-shell";
import { hasPostBodyContent } from "@/domain/post-body";
import { PostBody } from "@/features/posts/render/post-body";
import { sitePageMetadata } from "@/features/seo/site-metadata";
import { getCachedSetting } from "@/features/settings/cached-queries";
import { formatDate } from "@/lib/format-date";

export async function generateMetadata(): Promise<Metadata> {
  const { body } = await getCachedSetting("privacy");
  return sitePageMetadata({
    title: "Política de privacidad",
    description: `Cómo ${BRAND.name} cuida y usa los datos personales de quienes la contactan.`,
    path: "/privacidad",
    noindex: !hasPostBodyContent(body),
  });
}

export default async function PrivacidadPage() {
  const { body, updatedAt } = await getCachedSetting("privacy");

  return (
    <PageShell>
      <PageHeader title="Política de privacidad" className="mb-10">
        {updatedAt ? <p className="mt-5 font-cond text-sm font-bold uppercase tracking-[.1em] text-muted-foreground">Actualizado el {formatDate(new Date(updatedAt))}</p> : null}
      </PageHeader>
      {hasPostBodyContent(body) ? (
        <div className="max-w-[720px]">
          <PostBody doc={body} media={{}} />
        </div>
      ) : (
        <PageEmpty title="Pronto publicaremos nuestra política" text="Estamos preparando este documento." />
      )}
    </PageShell>
  );
}
