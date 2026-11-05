import { BRAND } from "@/domain/brand";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageEmpty, PageHeader, PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui-gc/button";
import { sitePageMetadata } from "@/features/seo/site-metadata";
import { getCachedSetting } from "@/features/settings/cached-queries";
import { contactDetails } from "@/features/settings/contact-details";

export async function generateMetadata(): Promise<Metadata> {
  const [contact, socials] = await Promise.all([getCachedSetting("contact"), getCachedSetting("socials")]);
  return sitePageMetadata({
    title: "Contacto",
    description: `Escríbenos o llámanos: correo, teléfono, WhatsApp y redes de ${BRAND.name}.`,
    path: "/contacto",
    // Sin ningún dato la página es un «Pronto…»: no se indexa hasta que se cargue el contacto.
    noindex: !contactDetails(contact, socials).hasDetails,
  });
}

const LINK_CLASS = "text-white underline decoration-brand decoration-2 underline-offset-4 hover:text-accent-bright";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-5">
      <dt className="font-cond text-[13px] font-extrabold uppercase tracking-[.2em] text-accent-bright">{label}</dt>
      <dd className="text-lg text-white/90">{children}</dd>
    </div>
  );
}

function FormLinks({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ""}`}>
      <Button variant="ghost" asChild>
        <Link href="/quiero-pelear">Quiero pelear</Link>
      </Button>
      <Button variant="ghost" asChild>
        <Link href="/patrocinar">Patrocinar</Link>
      </Button>
    </div>
  );
}

export default async function ContactoPage() {
  const [contact, socials] = await Promise.all([getCachedSetting("contact"), getCachedSetting("socials")]);
  const { whatsapp, phone, networks, hasDetails } = contactDetails(contact, socials);

  return (
    <PageShell>
      <PageHeader title="Contacto" />
      {hasDetails ? (
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <dl className="max-w-[720px]">
            {contact.email ? (
              <Detail label="Correo">
                <a href={`mailto:${contact.email}`} className={LINK_CLASS}>
                  {contact.email}
                </a>
              </Detail>
            ) : null}
            {phone ? (
              <Detail label="Teléfono">
                <a href={phone} className={LINK_CLASS}>
                  {contact.phone}
                </a>
              </Detail>
            ) : null}
            {contact.address ? <Detail label="Dirección">{contact.address}</Detail> : null}
            {networks.length > 0 ? (
              <Detail label="Redes">
                <ul className="flex flex-wrap gap-x-5 gap-y-2">
                  {networks.map((network) => (
                    <li key={network.network}>
                      <a href={network.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                        {network.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </Detail>
            ) : null}
          </dl>
          <aside className="flex flex-col items-start gap-4 border border-border bg-surface p-6 sm:p-8">
            {whatsapp ? (
              <Button variant="primary" asChild>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  Escríbenos por WhatsApp
                </a>
              </Button>
            ) : null}
            <p className="font-cond uppercase tracking-[.06em] text-muted-foreground">¿Quieres pelear o patrocinar un evento? Usa el formulario.</p>
            <FormLinks />
          </aside>
        </div>
      ) : (
        <PageEmpty title="Pronto publicaremos nuestros datos" text="Mientras tanto, puedes escribirnos desde los formularios.">
          <FormLinks className="mt-2 justify-center" />
        </PageEmpty>
      )}
    </PageShell>
  );
}
