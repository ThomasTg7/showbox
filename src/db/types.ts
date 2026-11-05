import type { Db } from "./index";

/** Lo que necesitan las escrituras para correr sobre la conexión o dentro de una transacción (`db.transaction(async (tx) => …)`). */
export type Executor = Pick<Db, "select" | "insert" | "update" | "delete">;
