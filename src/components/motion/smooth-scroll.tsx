"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type Lenis from "lenis";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type GsapInstance = typeof import("gsap").gsap;

/**
 * Solo en pantallas anchas (el mismo corte que el pin de la home). En el celular Lenis no suaviza el dedo, así que bajarlo
 * ahí sería JavaScript sin efecto: el desplazamiento nativo se queda.
 */
const SMOOTH_SCROLL_QUERY = "(min-width: 901px)";

const LenisContext = createContext<Lenis | null>(null);

export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const mediaQuery = window.matchMedia(SMOOTH_SCROLL_QUERY);
    // Cada (des)activación tiene su número: una carga que termina tarde, tras un cambio de ancho, no deja un Lenis colgado.
    let generation = 0;
    let instance: Lenis | undefined;
    let tick: ((time: number) => void) | undefined;
    let gsapInstance: GsapInstance | undefined;

    function disable() {
      generation += 1;
      if (tick && gsapInstance) {
        gsapInstance.ticker.remove(tick);
      }
      instance?.destroy();
      instance = undefined;
      tick = undefined;
      setLenis(null);
    }

    // Lenis y GSAP se cargan de forma diferida: solo el visitante de pantalla
    // ancha que permite animación paga el costo de este bundle.
    async function enable() {
      disable();
      if (!mediaQuery.matches) {
        return;
      }
      const current = generation;
      const [{ default: LenisConstructor }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (current !== generation) {
        return;
      }

      gsapInstance = gsap;
      gsap.registerPlugin(ScrollTrigger);
      // The html element has a fixed viewport height; observe the body so route changes and scroll pins update the limit.
      instance = new LenisConstructor({ content: document.body });
      instance.on("scroll", ScrollTrigger.update);

      tick = (time: number) => instance?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      setLenis(instance);
    }

    void enable();
    mediaQuery.addEventListener("change", enable);
    return () => {
      mediaQuery.removeEventListener("change", enable);
      disable();
    };
  }, [reducedMotion]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
