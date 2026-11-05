import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions, type Division } from "@/db/schema/divisions";

export async function listDivisions(db: Db, { activeOnly = false }: { activeOnly?: boolean } = {}): Promise<Division[]> {
  return db
    .select()
    .from(divisions)
    .where(activeOnly ? eq(divisions.active, true) : undefined)
    .orderBy(asc(divisions.gender), asc(divisions.sortOrder));
}
