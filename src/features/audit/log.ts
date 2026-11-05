import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";

export type AuditAction = "create" | "update" | "delete" | "restore" | "publish" | "result" | "login";

export type AuditEntry = {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  diff?: unknown;
};

/** Acepta la conexión o una transacción: la auditoría se puede escribir dentro de la misma transacción del cambio. */
export async function logAudit(db: Pick<Db, "insert">, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    summary: entry.summary,
    diff: entry.diff ?? null,
  });
}
