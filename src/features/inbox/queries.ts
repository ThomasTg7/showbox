import { and, count, desc, eq, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { inboxMessages, type InboxMessage } from "@/db/schema/inbox";

const ADMIN_PAGE_SIZE = 50;

export type InboxKind = InboxMessage["kind"];
export type InboxStatus = InboxMessage["status"];
export type InboxFilters = { kind?: InboxKind; status?: InboxStatus };

/** Una fila del listado: sin el contenido del mensaje (eso se lee solo al abrirlo). */
export type InboxRow = Pick<InboxMessage, "id" | "kind" | "name" | "email" | "phone" | "status" | "createdAt">;

/** Mensajes de la bandeja, los más nuevos primero, con los filtros que se pidan. Máximo 50 por página. */
export async function listInbox(
  db: Db,
  { kind, status }: InboxFilters,
  { page = 1, pageSize = ADMIN_PAGE_SIZE }: { page?: number; pageSize?: number } = {},
): Promise<{ items: InboxRow[]; hasMore: boolean }> {
  const conditions: SQL[] = [];
  if (kind) conditions.push(eq(inboxMessages.kind, kind));
  if (status) conditions.push(eq(inboxMessages.status, status));

  const rows = await db
    .select({
      id: inboxMessages.id,
      kind: inboxMessages.kind,
      name: inboxMessages.name,
      email: inboxMessages.email,
      phone: inboxMessages.phone,
      status: inboxMessages.status,
      createdAt: inboxMessages.createdAt,
    })
    .from(inboxMessages)
    .where(and(...conditions))
    .orderBy(desc(inboxMessages.createdAt))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

/** Cuántos mensajes nadie ha respondido todavía (el aviso de la barra lateral y del inicio). */
export async function countNewInbox(db: Db): Promise<number> {
  const [row] = await db.select({ total: count() }).from(inboxMessages).where(eq(inboxMessages.status, "new"));
  return row?.total ?? 0;
}

export async function getInboxMessage(db: Db, id: string): Promise<InboxMessage | null> {
  const [row] = await db.select().from(inboxMessages).where(eq(inboxMessages.id, id)).limit(1);
  return row ?? null;
}
