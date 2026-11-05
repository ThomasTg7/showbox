"use client";

import { useEffect, type RefObject } from "react";

/** Lo que el hook necesita del recortador (`react-easy-crop`): su contenedor y volver a medir. */
export type Measurable = { containerRef: HTMLDivElement | null; computeSizes: () => void };

/**
 * El diálogo del editor se abre con una animación de zoom (empieza al 95 %). Una foto liviana carga durante esa animación
 * y el recortador la mide achicada: el marco de recorte queda chico y corrido. El cambio de escala no cambia el tamaño de
 * diseño (no lo ve su ResizeObserver), así que se vuelve a medir cuando termina la animación del propio diálogo.
 */
export function useRemeasureAfterOpen(cropperRef: RefObject<Measurable | null>): void {
  useEffect(() => {
    const dialog = cropperRef.current?.containerRef?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const remeasure = (event: AnimationEvent) => {
      if (event.target === dialog) cropperRef.current?.computeSizes();
    };
    dialog.addEventListener("animationend", remeasure);
    return () => dialog.removeEventListener("animationend", remeasure);
  }, [cropperRef]);
}
