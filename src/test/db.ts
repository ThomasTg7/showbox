import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { Db } from "@/db";

let migratedTemplate: Promise<PGlite> | undefined;

// Arrancar PGlite (initdb) y migrar es lo caro; se hace una vez por worker de
// Vitest y cada test recibe un clon independiente de esa base ya migrada.
function getMigratedTemplate(): Promise<PGlite> {
  migratedTemplate ??= (async () => {
    const template = new PGlite();
    await migrate(drizzle(template), { migrationsFolder: "./drizzle" });
    return template;
  })();
  return migratedTemplate;
}

export async function createTestDb(): Promise<{ db: Db; close(): Promise<void> }> {
  const client = (await (await getMigratedTemplate()).clone()) as PGlite;
  const db = drizzle(client, { schema });

  return {
    // PGlite implementa el mismo dialecto Postgres que postgres.js; se
    // castea a Db porque drizzle tipa cada driver con su propio HKT.
    db: db as unknown as Db,
    close: () => client.close(),
  };
}
