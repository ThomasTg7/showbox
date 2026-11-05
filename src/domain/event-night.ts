import type { EventStatus } from "./bout-enums";

/** Cuántas horas antes de su inicio empieza «la noche» de un evento: desde ahí abrir Noche de pelea no sorprende a nadie. */
export const NIGHT_OPENS_HOURS_BEFORE = 12;

const HOUR_MS = 60 * 60 * 1000;

/** ¿Ya es la noche del evento? Falso antes de las 12 h previas al inicio; verdadero desde ahí y para siempre después. */
export function isEventNight(startsAt: Date, now: Date): boolean {
  return now.getTime() >= startsAt.getTime() - NIGHT_OPENS_HOURS_BEFORE * HOUR_MS;
}

/**
 * Cuántas horas después de su inicio un evento sigue siendo «próximo» aunque nadie lo haya marcado en vivo: una velada
 * dura unas horas y el panel puede tardar en abrir «Noche de pelea». La usan «Próximos» (en la base) y la venta de entradas.
 */
export const UPCOMING_GRACE_HOURS = 12;

/** ¿El evento empezó hace menos de `UPCOMING_GRACE_HOURS` (o aún no empieza)? */
export function isWithinUpcomingGrace(startsAt: Date, now: Date): boolean {
  return now.getTime() <= startsAt.getTime() + UPCOMING_GRACE_HOURS * HOUR_MS;
}

type Instant = Date | string;

/**
 * El estado que ve el público: un evento programado pasa solo a «en vivo» a su hora de inicio, sin que nadie lo marque, y
 * lo sigue estando hasta su fin estimado (o `UPCOMING_GRACE_HOURS` sin él). Finalizado, cancelado o ya en vivo no cambian:
 * el cierre lo pone la última pelea con resultado (o el panel).
 */
export function effectiveEventStatus(
  event: { eventStatus: EventStatus; startsAt: Instant; endsEstimatedAt?: Instant | null },
  now: Date,
): EventStatus {
  if (event.eventStatus !== "scheduled") return event.eventStatus;
  const start = new Date(event.startsAt).getTime();
  const end = event.endsEstimatedAt ? new Date(event.endsEstimatedAt).getTime() : start + UPCOMING_GRACE_HOURS * HOUR_MS;
  return now.getTime() >= start && now.getTime() < end ? "live" : "scheduled";
}

/** El mismo evento con el estado que ve el público (`effectiveEventStatus`). */
export function withEffectiveStatus<T extends { eventStatus: EventStatus; startsAt: Instant; endsEstimatedAt?: Instant | null }>(event: T, now: Date): T {
  const eventStatus = effectiveEventStatus(event, now);
  return eventStatus === event.eventStatus ? event : { ...event, eventStatus };
}
