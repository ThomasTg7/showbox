"use client";

import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const REVEAL_TRANSITION = "opacity .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1)";

/**
 * Revela con un suave desplazamiento los elementos `[data-reveal]` que están bajo la pantalla al cargar, cuando llegan a
 * ella. Solo `opacity` y `transform`. El HTML del servidor trae todo visible: esto parte de lo ya hidratado y solo oculta lo
 * que aún no se ve, así sin JavaScript, o con «reducir movimiento», nada queda escondido.
 */
export function ScrollReveal() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const pending = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter((element) => element.getBoundingClientRect().top > window.innerHeight * 0.9);
    if (pending.length === 0) return;

    for (const element of pending) {
      element.style.opacity = "0";
      element.style.transform = "translateY(40px)";
      element.style.transition = REVEAL_TRANSITION;
    }
    const show = (element: HTMLElement) => {
      element.style.opacity = "";
      element.style.transform = "";
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const element of pending) observer.observe(element);

    return () => {
      observer.disconnect();
      for (const element of pending) {
        show(element);
        element.style.transition = "";
      }
    };
  }, [reducedMotion]);

  return null;
}
