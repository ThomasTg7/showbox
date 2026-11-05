"use client";

import { useEffect, type RefObject } from "react";
import { useReducedMotion } from "./use-reduced-motion";

const DURATION_MS = 900;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

/**
 * Cuenta desde 0 hasta su valor cada `[data-count]` dentro de `rootRef` cuando el contenedor entra en pantalla. El HTML
 * del servidor ya trae los valores finales (legibles sin JavaScript ni animación); con «reducir movimiento» no cuenta.
 * `key` cambia cuando cambian las cifras (vuelve a observar).
 */
export function useCountUp(rootRef: RefObject<HTMLElement | null>, key: unknown, { threshold = 0.6, durationMs = DURATION_MS } = {}): void {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const numbers = [...root.querySelectorAll<HTMLElement>("[data-count]")];
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1);
          for (const element of numbers) element.textContent = String(Math.round(Number(element.dataset.count) * easeOut(progress)));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      // Si se cancela a mitad de camino, vuelven los valores reales.
      for (const element of numbers) element.textContent = element.dataset.count ?? "";
    };
  }, [rootRef, reducedMotion, key, threshold, durationMs]);
}
