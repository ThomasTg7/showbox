import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * `case id when a then 0 when b then 1 … end`: escribe el orden 0..n-1 de una lista de ids en un solo UPDATE
 * (usar con `where id in (…)`). El orden siempre queda contiguo, sin huecos ni repetidos.
 */
export function sortOrderCase(idColumn: AnyPgColumn, ids: string[]): SQL {
  const branches = ids.map((id, index) => sql`when ${id}::uuid then ${index}::int`);
  return sql`case ${idColumn} ${sql.join(branches, sql` `)} else 0 end`;
}
