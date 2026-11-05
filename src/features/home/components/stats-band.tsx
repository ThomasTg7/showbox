"use client";
import { BRAND } from "@/domain/brand";

import { useEffect, useRef } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { HomeStats } from "../dto";

const LABELS: { key: keyof HomeStats; label: string }[] = [
  { key: "events", label: "Eventos" },
  { key: "bouts", label: "Peleas" },
  { key: "finishes", label: "Finalizaciones" },
  { key: "koTko", label: "KO / TKO" },
];

/** El texto gigante de fondo se desliza hacia la izquierda con el scroll (solo `transform`, solo mientras la banda se ve). */
function useSlideOnScroll(sectionRef: React.RefObject<HTMLElement | null>, textRef: React.RefObject<HTMLElement | null>) {
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const section = sectionRef.current;
    const text = textRef.current;
    if (!section || !text || reducedMotion) return;

    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const box = section.getBoundingClientRect();
      // 0 cuando la banda entra por abajo, 1 cuando sale por arriba.
      const progress = Math.min(Math.max((window.innerHeight - box.top) / (window.innerHeight + box.height), 0), 1);
      text.style.transform = `translate3d(${-35 * progress}%, -50%, 0)`;
    };
    const onScroll = () => {
      if (visible && frame === 0) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) onScroll();
    });
    observer.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(frame);
      text.style.transform = "";
    };
  }, [sectionRef, textRef, reducedMotion]);
}

/**
 * Banda oscura de cifras: eventos, peleas, finalizaciones y KO/TKO de la promotora, con contadores y un texto
 * gigante de fondo que se desliza. El HTML trae las cifras finales (se leen sin animación).
 */
export function StatsBand({ stats }: { stats: HomeStats }) {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDListElement>(null);
  const bigLineRef = useRef<HTMLDivElement>(null);
  useCountUp(listRef, stats, { threshold: 0.3, durationMs: 1600 });
  useSlideOnScroll(sectionRef, bigLineRef);

  return (
    <section ref={sectionRef} aria-label={`${BRAND.name} en cifras`} className="relative overflow-hidden border-y border-border bg-surface py-[72px] text-white">
      <div
        ref={bigLineRef}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 whitespace-nowrap font-display text-[16vw] leading-[.8] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.06)]"
      >
        OFL · OFL · OFL
      </div>
      <div className="relative mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)]">
        <dl ref={listRef} data-reveal className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {LABELS.map(({ key, label }) => (
            <div key={key} className="flex flex-col-reverse items-start">
              <dt className="inline-block border-t-2 border-brand pt-3 font-cond text-sm font-semibold tracking-[.04em] text-accent-bright">{label}</dt>
              <dd className="font-display text-[clamp(64px,9vw,130px)] leading-[.9] tabular-nums">
                <span data-count={stats[key]}>{stats[key]}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
