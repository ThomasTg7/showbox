"use client";
import { BRAND } from "@/domain/brand";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { MobileMenu } from "./mobile-menu";
import { isActiveNavLink, NAV_LINKS } from "./nav-links";
import { useFloatingControls } from "./use-floating-controls";
import { useCoverVisibility } from "./use-cover-visibility";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { hidden: activityHidden, keyboardNavigation, interactionProps } = useFloatingControls(menuOpen, "navbar", pathname);
  const coverVisible = useCoverVisibility(pathname);
  const hidden = activityHidden || (coverVisible && !keyboardNavigation && !menuOpen);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // El botón vuelve a ser visible recién al cerrar; se enfoca en el siguiente frame.
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  return (
    <>
      <header
        {...interactionProps}
        inert={hidden && !menuOpen}
        data-hidden={hidden && !menuOpen}
        className={cn(
          "sb-header fixed inset-x-3 z-[100] isolate mx-auto flex max-w-[1040px] items-center lg:inset-x-6",
          hidden && !menuOpen && "pointer-events-none",
        )}
      >
        <div className="relative flex h-full w-full items-center px-3 lg:px-5">
          <Link href="/" aria-label={`${BRAND.name} inicio`} className="sb-header-brand absolute left-1/2 top-1/2 z-10 flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <Logo size="sm" className="w-[96px] lg:w-[112px]" />
          </Link>
          <nav aria-label="Principal" className="hidden w-full grid-cols-[minmax(0,1fr)_184px_minmax(0,1fr)] items-center lg:grid">
            {[NAV_LINKS.slice(0, 3), NAV_LINKS.slice(3)].map((group, index) => <div key={index} className={cn("flex items-center gap-1 xl:gap-2", index === 0 ? "justify-end" : "col-start-3 justify-start")}>
            {group.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActiveNavLink(pathname, link.href) ? "page" : undefined}
                className={cn(
                  "sb-nav-link font-cond text-[12px] font-bold uppercase tracking-[.08em] xl:text-[13px]",
                  isActiveNavLink(pathname, link.href) ? "text-accent-bright" : "text-white/85 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
            </div>)}
          </nav>
          <div className="ml-auto flex items-center lg:absolute lg:right-4">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menú"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="lg:hidden w-11 h-11 grid place-items-center text-white"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                aria-hidden="true"
              >
                <path d="M3 7h18M3 12h18M3 17h12" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </>
  );
}
