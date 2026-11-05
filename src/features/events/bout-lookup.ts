import type { BoutDTO, EventPageDTO } from "./dto";

/** Enlace a la página de una pelea (`/eventos/<evento>/peleas/<id>`). */
export function boutHref(eventSlug: string, boutId: string): string {
  return `/eventos/${eventSlug}/peleas/${boutId}`;
}

/** La pelea del evento con su bloque («Cartelera estelar»), o `null` si no es de este evento. */
export function findEventBout(event: Pick<EventPageDTO, "segments">, boutId: string): { bout: BoutDTO; segmentName: string } | null {
  for (const segment of event.segments) {
    const bout = segment.bouts.find((candidate) => candidate.id === boutId);
    if (bout) return { bout, segmentName: segment.name };
  }
  return null;
}
