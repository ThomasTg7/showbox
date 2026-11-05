import { and, desc, eq, isNotNull, isNull, lte, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Db } from "@/db";
import type { Executor } from "@/db/types";
import { logAudit } from "@/features/audit/log";
import { UserFacingError } from "@/lib/user-facing-error";
import { TRASHABLE_ENTITIES } from "./registry";

export type TrashableEntity = {
  /** Identificador estable, se guarda en audit_log.entity_type. */
  type: string;
  /** Nombre para personas, en singular: "Boxeador". */
  label: string;
  table: PgTable & { id: AnyPgColumn; deletedAt: AnyPgColumn };
  /** Columna o expresión que describe el elemento en la papelera ("Tomás Vera"). */
  title: AnyPgColumn | SQL<string>;
  /**
   * Invalida las cachés públicas de la entidad. La papelera lo llama tras restaurar (enviar a la papelera lo hace la
   * action de cada entidad); solo puede usar funciones de caché válidas en server actions (`updateTag`).
   */
  revalidate?: (id: string) => void;
};

export type TrashItem = {
  entityType: string;
  entityLabel: string;
  id: string;
  title: string;
  deletedAt: Date;
};

export type TrashPage = { items: TrashItem[]; hasMore: boolean };

const DEFAULT_PAGE_SIZE = 50;

export function createTrash(entities: TrashableEntity[]) {
  const byType = new Map(entities.map((entity) => [entity.type, entity]));

  function getEntity(type: string): TrashableEntity {
    const entity = byType.get(type);
    if (!entity) {
      throw new Error(`No hay papelera registrada para "${type}"`);
    }
    return entity;
  }

  /** Acepta una transacción: quien necesita revisar algo antes (p. ej. `deleteFighter`) lo hace en la misma. */
  async function softDelete(db: Executor, type: string, id: string, actorId: string): Promise<void> {
    const entity = getEntity(type);
    const [row] = await db
      .update(entity.table)
      .set({ deletedAt: new Date() })
      .where(and(eq(entity.table.id, id), isNull(entity.table.deletedAt)))
      .returning({ title: entity.title });
    if (!row) {
      throw new UserFacingError("No se encontró el elemento o ya estaba en la papelera");
    }
    await logAudit(db, {
      actorId,
      action: "delete",
      entityType: type,
      entityId: id,
      summary: `Envió a la papelera ${entity.label} «${row.title}»`,
    });
  }

  async function restore(db: Db, type: string, id: string, actorId: string): Promise<void> {
    const entity = getEntity(type);
    const [row] = await db
      .update(entity.table)
      .set({ deletedAt: null })
      .where(and(eq(entity.table.id, id), isNotNull(entity.table.deletedAt)))
      .returning({ title: entity.title });
    if (!row) {
      throw new UserFacingError("No se encontró el elemento en la papelera");
    }
    await logAudit(db, {
      actorId,
      action: "restore",
      entityType: type,
      entityId: id,
      summary: `Restauró ${entity.label} «${row.title}»`,
    });
  }

  // Una consulta por tipo (pocos tipos, en paralelo) y mezcla en memoria: la
  // papelera se purga a los 30 días, así que nunca crece mucho.
  async function listTrash(db: Db, { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}): Promise<TrashPage> {
    const take = page * pageSize + 1;
    const perEntity = await Promise.all(
      entities.map(async (entity) => {
        const rows = await db
          .select({ id: entity.table.id, title: entity.title, deletedAt: entity.table.deletedAt })
          .from(entity.table)
          .where(isNotNull(entity.table.deletedAt))
          .orderBy(desc(entity.table.deletedAt))
          .limit(take);
        return rows.map((row) => ({
          entityType: entity.type,
          entityLabel: entity.label,
          id: String(row.id),
          title: String(row.title),
          deletedAt: row.deletedAt as Date,
        }));
      }),
    );

    const all = perEntity.flat().sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), hasMore: all.length > start + pageSize };
  }

  async function purgeExpired(db: Db, now: Date, days = 30): Promise<number> {
    const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const deleted = await Promise.all(
      entities.map((entity) =>
        db
          .delete(entity.table)
          .where(and(isNotNull(entity.table.deletedAt), lte(entity.table.deletedAt, threshold)))
          .returning({ id: entity.table.id }),
      ),
    );
    return deleted.reduce((total, rows) => total + rows.length, 0);
  }

  return { softDelete, restore, listTrash, purgeExpired };
}

export const { softDelete, restore, listTrash, purgeExpired } = createTrash(TRASHABLE_ENTITIES);
