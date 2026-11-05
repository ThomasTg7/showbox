"use client";
import { BRAND } from "@/domain/brand";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui-gc/button";
import { cn } from "@/lib/cn";
import { MobileMenu } from "./mobile-menu";
import { isActiveNavLink, NAV_LINKS } from "./nav-links";

export function Header() {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setSolid(y > 40);
      const hero = document.querySelector("[data-site-hero]");
      setHidden(Boolean(hero && hero.getBoundingClientRect().bottom > 76));
    }
    const observer = new MutationObserver(onScroll);
    observer.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // El botón vuelve a ser visible recién al cerrar; se enfoca en el siguiente frame.
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  return (
    <>
      <header
        inert={hidden && !menuOpen}
        className={cn(
          // Fondo sólido como capa aparte con opacity: solo se animan transform y opacity.
          "sb-header fixed top-0 left-0 right-0 z-[100] h-[76px] flex items-center transition-transform duration-300 ease-sb",
          "before:absolute before:inset-0 before:-z-10 before:bg-black/90 before:backdrop-blur-md before:border-b before:border-border before:opacity-0 before:transition-opacity before:duration-300",
          solid && "before:opacity-100",
          hidden && !menuOpen && "-translate-y-full",
        )}
      >
        <div className="max-w-[1320px] mx-auto w-full px-[clamp(16px,4vw,64px)] flex items-center gap-8">
          <Link href="/" aria-label={`${BRAND.name} inicio`}>
            <Logo />
          </Link>
          <nav aria-label="Principal" className="hidden lg:flex gap-8 mr-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActiveNavLink(pathname, link.href) ? "page" : undefined}
                className={cn(
                  "sb-nav-link font-cond font-bold uppercase tracking-[.06em] text-[15px]",
                  isActiveNavLink(pathname, link.href) ? "text-accent-bright" : "text-white/85 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4 ml-auto lg:ml-0">
            <Button asChild variant="primary" className="hidden lg:inline-flex">
              <Link href="/entradas">Comprar entradas</Link>
            </Button>
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
