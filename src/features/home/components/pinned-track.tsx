"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** El desplazamiento horizontal fijado solo en pantallas anchas (el plan: `min-width: 901px`); más angosto, carrusel con imán. */
const PIN_QUERY = "(min-width: 901px)";

type PinnedTrackProps = {
  /** Un `<li>` por tarjeta, ya armados por el servidor. */
  children: ReactNode;
  /** La sección que se fija (la que contiene el título y la pista). */
  sectionId: string;
  label: string;
};

/**
 * La pista de tarjetas de «Boxeadores». Sin JavaScript, con «reducir movimiento» o en pantallas angostas es un carrusel con
 * `scroll-snap`, que también se recorre con el teclado. En pantallas anchas, GSAP (cargado solo aquí y solo entonces) fija la
 * sección y desplaza la pista en horizontal con el scroll vertical, como la maqueta.
 */
export function PinnedTrack({ children, sectionId, label }: PinnedTrackProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const mediaQuery = window.matchMedia(PIN_QUERY);
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const section = document.getElementById(sectionId);
    if (reducedMotion || !viewport || !track || !section) return;

    let cleanup: (() => void) | undefined;
    // Cada cambio de ancho tiene su número: una carga de GSAP que termina tarde no arma un segundo pin encima del vigente.
    let generation = 0;

    async function enable() {
      generation += 1;
      const current = generation;
      cleanup?.();
      cleanup = undefined;
      if (!mediaQuery.matches || !viewport || !track || !section) return;
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (current !== generation || !mediaQuery.matches) return;
      gsap.registerPlugin(ScrollTrigger);

      viewport.style.overflowX = "hidden";
      viewport.style.scrollSnapType = "none";
      const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
      const context = gsap.context(() => {
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: section, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
        });
      }, section);
      cleanup = () => {
        context.revert();
        viewport.style.overflowX = "";
        viewport.style.scrollSnapType = "";
        track.style.transform = "";
      };
    }

    void enable();
    mediaQuery.addEventListener("change", enable);
    return () => {
      generation += 1;
      mediaQuery.removeEventListener("change", enable);
      cleanup?.();
    };
  }, [reducedMotion, sectionId]);

  return (
    <div
      ref={viewportRef}
      // Enfocable: sin ratón ni JavaScript el carrusel se recorre con las flechas del teclado.
      tabIndex={0}
      role="group"
      aria-label={label}
      className="scroll-px-[clamp(16px,4vw,64px)] overflow-x-auto overscroll-x-contain snap-x snap-mandatory [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-accent-bright [&::-webkit-scrollbar]:hidden"
    >
      <ul ref={trackRef} className="flex w-max gap-4 px-[clamp(16px,4vw,64px)] pb-[clamp(56px,8vw,110px)] will-change-transform sm:gap-6">
        {children}
      </ul>
    </div>
  );
}
