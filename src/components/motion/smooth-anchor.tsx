"use client";

import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useLenis } from "./smooth-scroll";

/**
 * Enlace a una sección de la misma página (`href="#cartelera"`) que se desliza hasta ella en vez de saltar. Usa Lenis si
 * ya cargó (el resto del sitio se desplaza con él) y, si no, el desplazamiento suave del navegador; con «reducir
 * movimiento» salta directo. Sin JavaScript sigue siendo un enlace normal.
 */
export function SmoothAnchor({ href, onClick, ...props }: ComponentPropsWithoutRef<"a"> & { href: `#${string}` }) {
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;

    event.preventDefault();
    if (lenis && !reducedMotion) lenis.scrollTo(target, { duration: 1.3 });
    else target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", href);
  }

  return <a href={href} onClick={handleClick} {...props} />;
}
