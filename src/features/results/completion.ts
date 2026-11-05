import { and, eq, isNull } from "drizzle-orm";
import { bouts, events } from "@/db/schema/events";
import type { Executor } from "@/db/types";
import { logAudit } from "@/features/audit/log";
import { getNextPendingBoutId } from "./night-order";

/**
 * Cierra el evento cuando ya no queda ninguna pelea por pelear: programado o en vivo, con al menos una pelea con
 * resultado y ninguna pendiente (las canceladas no cuentan). Lo llama todo lo que puede dejar la cartelera sin
 * pendientes: guardar el último resultado, cancelar o eliminar la última pelea pendiente. Va dentro de la
 * transacción de quien la llama, con su misma auditoría.
 */
export async function completeEventIfDone(tx: Executor, eventId: string, actorId: string): Promise<void> {
  const [event] = await tx
    .select({ name: events.name, eventStatus: events.eventStatus })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!event || (event.eventStatus !== "scheduled" && event.eventStatus !== "live")) return;
  if ((await getNextPendingBoutId(tx, eventId)) !== null) return;

  const [fought] = await tx
    .select({ id: bouts.id })
    .from(bouts)
    .where(and(eq(bouts.eventId, eventId), eq(bouts.boutStatus, "completed")))
    .limit(1);
  if (!fought) return;

  await tx.update(events).set({ eventStatus: "completed" }).where(eq(events.id, eventId));
  await logAudit(tx, { actorId, action: "update", entityType: "event", entityId: eventId, summary: `Finalizó el evento ${event.name}: todas las peleas tienen resultado` });
}
