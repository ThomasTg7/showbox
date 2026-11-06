"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLenis } from "@/components/motion/smooth-scroll";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/cn";
import { isActiveNavLink, NAV_LINKS } from "./nav-links";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const navRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lenis = useLenis();
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  // Sigue en pantalla mientras corre la animación de cierre; `onAnimationEnd` lo esconde. Sin movimiento, se esconde al tiro.
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);
  if (!open && present && reducedMotion) setPresent(false);
  const closing = present && !open;

  useEffect(() => {
    if (!open) {
      return;
    }
    closeButtonRef.current?.focus();
    lenis?.stop();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    function onEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("keydown", onEscape);
      root.style.overflow = previousOverflow;
      lenis?.start();
    };
  }, [open, onClose, lenis]);

  // Mantiene el foco dentro del menú mientras está abierto.
  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab" || !navRef.current) {
      return;
    }
    const focusable = navRef.current.querySelectorAll<HTMLElement>("a[href], button");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <nav
      ref={navRef}
      id="mobile-menu"
      aria-label="Menú móvil"
      hidden={!present}
      inert={closing}
      data-state={closing ? "closing" : open ? "open" : "closed"}
      onKeyDown={trapFocus}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && !open) setPresent(false);
      }}
      className={cn(
        "fixed inset-0 z-[110] bg-black flex flex-col justify-center gap-2 px-[clamp(16px,4vw,64px)]",
        closing
          ? "motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-top-4 duration-300 ease-sb fill-mode-forwards"
          : "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 duration-300 ease-sb",
      )}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Cerrar menú"
        className="absolute top-4 right-4 w-11 h-11 grid place-items-center text-white text-2xl"
      >
        <span aria-hidden="true">✕</span>
      </button>
      {NAV_LINKS.map((link) => {
        const active = isActiveNavLink(pathname, link.href);
        return (
        <Link
          key={link.href}
          href={link.href}
          onClick={onClose}
          aria-current={active ? "page" : undefined}
          className={cn("flex min-h-11 w-fit max-w-full items-center whitespace-nowrap font-display text-[clamp(28px,9vw,56px)] uppercase leading-[1.1] tracking-[-.02em] hover:text-accent-bright focus-visible:text-accent-bright", active ? "text-accent-bright" : "text-white")}
        >
          {link.label}
        </Link>
        );
      })}
    </nav>
  );
}
