import { updateTag } from "next/cache";

/** Tag de los listados públicos de eventos (`/eventos`, `/entradas`, home) y del historial de las fichas. */
export const EVENTS_LIST_TAG = "events";

export function eventCacheTag(id: string): string {
  return `event:${id}`;
}

/**
 * Expira al instante la página del evento y los listados donde aparece (también el historial de las fichas, que lleva
 * `EVENTS_LIST_TAG`). Solo desde server actions: `updateTag` no sirve contenido viejo ni una vez, y despublicar o
 * enviar a la papelera un evento debe ocultarlo ya. Quien cambia una pelea invalida además a sus boxeadores.
 */
export function revalidateEvent(id: string): void {
  updateTag(eventCacheTag(id));
  updateTag(EVENTS_LIST_TAG);
}

