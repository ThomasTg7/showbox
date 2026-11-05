"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Más allá de esto no se programa nada: quien deja la pestaña abierta un día entero recarga igual. */
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;

/**
 * Vuelve a pedir la página a la hora `at` (ISO): quien mira el evento justo antes de que empiece ve aparecer «En vivo» y
 * los resultados sin recargar. Una sola petición, no un sondeo.
 */
export function RefreshAt({ at }: { at: string }) {
  const router = useRouter();

  useEffect(() => {
    const wait = new Date(at).getTime() - Date.now();
    if (wait < 0 || wait > MAX_WAIT_MS) return;
    // Un segundo de margen: el servidor tiene que ver ya la hora de inicio.
    const timer = setTimeout(() => router.refresh(), wait + 1000);
    return () => clearTimeout(timer);
  }, [at, router]);

  return null;
}
