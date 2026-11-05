import { useCallback, useSyncExternalStore } from "react";

/**
 * ¿La pantalla cumple la media query ahora? Se actualiza sola cuando cambia (girar una tablet, agrandar la ventana, cambiar
 * la preferencia de movimiento). En el servidor no se sabe: devuelve `false` y React corrige tras hidratar.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", callback);
      return () => mediaQuery.removeEventListener("change", callback);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
