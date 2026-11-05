import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb } from "./db";

describe("createTestDb", () => {
  it("runs a query against an in-process Postgres", async () => {
    const { db, close } = await createTestDb();
    try {
      // El tipo Db asume el driver postgres.js (execute devuelve un
      // arreglo); el driver real detrás de createTestDb es PGlite, cuyo
      // execute() devuelve { rows }. Se castea para reflejar la forma real.
      const result = (await db.execute(sql`select 1 as ok`)) as unknown as {
        rows: Array<{ ok: number }>;
      };
      expect(result.rows[0]).toEqual({ ok: 1 });
    } finally {
      await close();
    }
  });
});
