import { BRAND } from "@/domain/brand";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { getCachedSetting } from "@/features/settings/cached-queries";
import { getCachedSponsors } from "@/features/sponsors/cached-queries";
import { SponsorLogo } from "@/features/sponsors/components/sponsor-logo";
import { socialLinks } from "@/features/settings/social-links";
import { NAV_LINKS } from "./nav-links";

const LINK_CLASS = "font-cond font-semibold uppercase tracking-[.04em] text-muted-foreground hover:text-white transition-opacity";

function FooterColumn({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <nav aria-label={label}>
      <h2 className="font-cond font-extrabold uppercase tracking-[.16em] text-[13px] text-accent-bright mb-4">{title}</h2>
      <ul className="grid gap-2.5">{children}</ul>
    </nav>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className={LINK_CLASS}>
        {children}
      </Link>
    </li>
  );
}

export async function Footer() {
  const [socials, footer, contact, sponsors] = await Promise.all([
    getCachedSetting("socials"),
    getCachedSetting("footer"),
    getCachedSetting("contact"),
    getCachedSponsors("footer"),
  ]);
  const networks = socialLinks(socials);

  return (
    <footer className="bg-black pt-16 pb-8 border-t border-brand">
      <div className="max-w-[1320px] mx-auto w-full px-[clamp(16px,4vw,64px)]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-5">
            <Logo />
            <p className="sb-spaced text-[11px] text-white/70">Boxeo profesional · Ecuador</p>
            {footer.tagline ? <p className="max-w-xs text-muted-foreground">{footer.tagline}</p> : null}
            {networks.length > 0 ? (
              <nav aria-label="Redes sociales">
                <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
                  {networks.map((network) => (
                    <li key={network.network}>
                      <a href={network.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                        {network.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
          <FooterColumn label="Secciones" title="Secciones">
            {NAV_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>
          <FooterColumn label="Promotora" title={`${BRAND.name}`}>
            <FooterLink href="/nosotros">Nosotros</FooterLink>
            <FooterLink href="/quiero-pelear">Quiero pelear</FooterLink>
            <FooterLink href="/patrocinar">Patrocinar</FooterLink>
          </FooterColumn>
          <FooterColumn label="Legal" title="Legal">
            <FooterLink href="/contacto">Contacto</FooterLink>
            <FooterLink href="/privacidad">Privacidad</FooterLink>
          </FooterColumn>
        </div>
        {sponsors.length > 0 ? (
          <section aria-label="Patrocinadores principales" className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-border pt-8">
            <h2 className="font-cond text-[13px] font-extrabold uppercase tracking-[.16em] text-accent-bright">Nos patrocinan</h2>
            <ul className="flex flex-wrap items-center gap-x-10 gap-y-5">
              {sponsors.map((sponsor) => (
                <li key={sponsor.id}>
                  <SponsorLogo sponsor={sponsor} sizes="160px" className="w-32 sm:w-40" muted />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="mt-14 pt-6 border-t border-border flex flex-wrap justify-between gap-2.5 text-muted-foreground text-sm">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <span>{contact.address || "Quito, Ecuador"}</span>
        </div>
      </div>
    </footer>
  );
}
