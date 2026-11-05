"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Mientras el evento está en vivo, vuelve a pedir la página cada `intervalMs` para mostrar los resultados que se van
 * cargando (el servidor los tiene al instante: la action de guardar expira la caché). Se pausa con la pestaña oculta y
 * se actualiza apenas vuelve a verse.
 */
export function LiveRefresher({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
