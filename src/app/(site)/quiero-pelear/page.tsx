import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/site/page-shell";
import { FighterApplicationForm } from "@/features/inbox/components/fighter-application-form";
import { sitePageMetadata } from "@/features/seo/site-metadata";

export function generateMetadata(): Promise<Metadata> {
  return sitePageMetadata({
    title: "Quiero pelear",
    description: `Postula para pelear en ${BRAND.name}: cuéntanos tu peso, récord y gimnasio y te escribimos.`,
    path: "/quiero-pelear",
  });
}

export default function QuieroPelearPage() {
  return (
    <PageShell>
      <PageHeader title="Quiero pelear" className="mb-10">
        <p className="mt-6 max-w-prose text-lg text-white/90">
          ¿Boxeas y quieres subir al ring de {BRAND.name}? Cuéntanos de ti. Revisamos cada postulación y te escribimos si tu perfil encaja con una próxima velada.
        </p>
      </PageHeader>
      <div className="max-w-[760px]">
        <FighterApplicationForm />
      </div>
    </PageShell>
  );
}
