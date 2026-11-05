import { and, eq, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

type PublicScopeColumns = {
  status: AnyPgColumn;
  publishAt: AnyPgColumn;
  deletedAt: AnyPgColumn;
};

export function publicScope(table: PublicScopeColumns): SQL {
  return and(
    isNull(table.deletedAt),
    or(eq(table.status, "published"), and(eq(table.status, "scheduled"), lte(table.publishAt, sql`now()`))),
  ) as SQL;
}
