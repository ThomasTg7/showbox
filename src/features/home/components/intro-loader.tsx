"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Logo } from "@/components/brand/logo";
import { BrandMark } from "@/components/brand/brand-mark";

const SEEN_KEY = "sb-intro-seen";
const SHOW_MS = 1100;
const LEAVE_MS = 300;

type Phase = "idle" | "showing" | "leaving" | "done";

/** Quién ya vio la presentación en esta sesión. El almacenamiento puede estar bloqueado: entonces no se muestra (nunca falla). */
function markSeen(): boolean {
  try {
    if (window.sessionStorage.getItem(SEEN_KEY)) return false;
    window.sessionStorage.setItem(SEEN_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Presentación ShowBox solo en la primera visita de la sesión y nunca con
 * «reducir movimiento». Aparece después de hidratar: el contenido y la imagen principal ya están pintados debajo, así que no
 * retrasa nada ni esconde información. No intercepta clics y los lectores de pantalla la ignoran.
 */
export function IntroLoader() {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  // En desarrollo React monta el efecto dos veces: la decisión se toma una sola vez y se recuerda.
  const shouldShow = useRef<boolean | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    shouldShow.current ??= markSeen();
    if (!shouldShow.current) return;
    const start = setTimeout(() => setPhase("showing"), 0);
    const leave = setTimeout(() => setPhase("leaving"), SHOW_MS);
    const finish = setTimeout(() => setPhase("done"), SHOW_MS + LEAVE_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(leave);
      clearTimeout(finish);
    };
  }, [reducedMotion]);

  if (phase === "idle" || phase === "done") return null;

  return (
    <div
      data-slot="intro-loader"
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-5 right-5 z-[1000] grid h-28 w-40 place-items-center overflow-hidden border border-brand bg-black transition-[transform,opacity] duration-300 ease-sb ${phase === "leaving" ? "sb-intro-leaving" : ""}`}
    >
      <BrandMark className="sb-intro-mark absolute h-28 opacity-50" />
      <div className="sb-intro-logo relative"><Logo size="md" /></div>
    </div>
  );
}
