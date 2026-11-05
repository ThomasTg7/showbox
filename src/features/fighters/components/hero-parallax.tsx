"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const SPEED = 0.1;
const MAX_SHIFT_PX = 60;
/** En celular la foto queda sobre el texto: moverla al hacer scroll solo la corre hacia lo que tiene debajo. Solo escritorio. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Desplaza su contenido un poco más lento que el scroll (hasta `MAX_SHIFT_PX`), solo en escritorio. Solo `transform`,
 * solo mientras es visible y sin movimiento si la persona lo pidió. Girar una tablet o cambiar el ancho lo enciende o lo apaga.
 * El contenedor de la foto debe recortar (`overflow-hidden`).
 */
export function HeroParallax({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || !isDesktop) return;

    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      element.style.transform = `translate3d(0, ${Math.min(Math.round(window.scrollY * SPEED), MAX_SHIFT_PX)}px, 0)`;
    };
    const onScroll = () => {
      if (visible && frame === 0) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    observer.observe(element.parentElement ?? element);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(frame);
      element.style.transform = "";
    };
  }, [reducedMotion, isDesktop]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
