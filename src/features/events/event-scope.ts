import { and, eq, gte, ne, or, sql, type SQL } from "drizzle-orm";
import { events } from "@/db/schema/events";
import { UPCOMING_GRACE_HOURS } from "@/domain/event-night";

const UPCOMING_GRACE = sql`now() - make_interval(hours => ${UPCOMING_GRACE_HOURS}::int)`;

/**
 * «Próximos» del sitio: en vivo, o no finalizado y con inicio reciente o futuro. Un evento cancelado con fecha futura
 * se muestra (con su etiqueta) hasta que pasa. Todo lo demás es «Pasados».
 */
export function upcomingEvents(): SQL {
  return or(eq(events.eventStatus, "live"), and(ne(events.eventStatus, "completed"), gte(events.startsAt, UPCOMING_GRACE))) as SQL;
}

/** Eventos donde una pelea programada todavía puede ocurrir (en vivo, o programado y por venir; no cancelado). */
export function eventsWithPendingBouts(): SQL {
  return or(eq(events.eventStatus, "live"), and(eq(events.eventStatus, "scheduled"), gte(events.startsAt, UPCOMING_GRACE))) as SQL;
}
