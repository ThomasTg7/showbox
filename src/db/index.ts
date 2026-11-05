import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

// En `next dev` cada recarga vuelve a evaluar este módulo: reutilizamos el
// cliente para no abrir conexiones nuevas en cada cambio de código.
const globalForDb = globalThis as unknown as { postgresClient?: postgres.Sql };

// `prepare: false`: los poolers en modo transacción (Supabase, PgBouncer)
// no soportan prepared statements; así la misma DATABASE_URL sirve en
// cualquier proveedor o en un VPS.
const client = globalForDb.postgresClient ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });

export type Db = typeof db;
