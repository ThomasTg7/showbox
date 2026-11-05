import { desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { user } from "@/db/schema/auth";

export type AuditLogEntry = {
  id: string;
  actorId: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: Date;
};

export type AuditLogPage = { entries: AuditLogEntry[]; hasMore: boolean };

const DEFAULT_PAGE_SIZE = 50;

export async function listAuditLog(db: Db, { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}): Promise<AuditLogPage> {
  const rows = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      actorEmail: user.email,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      summary: auditLog.summary,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .orderBy(desc(auditLog.createdAt))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return { entries: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}
