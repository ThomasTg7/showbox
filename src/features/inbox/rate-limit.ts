import { createHash } from "node:crypto";
import { lte, sql } from "drizzle-orm";
import { formRateLimits } from "@/db/schema/inbox";
import type { Executor } from "@/db/types";

export const MAX_SUBMISSIONS_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

/** SHA-256 de la IP con sal: se guarda esto, nunca la dirección. */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Cuenta un envío de esta dirección y dice si aún está dentro del límite (5 por hora desde el primero de la hora en curso).
 * Una sola fila por dirección: primero se borran las horas ya vencidas (de cualquiera, así la tabla no crece sin fin) y
 * después se suma con un `upsert` atómico, así dos envíos a la vez no se saltan el tope.
 */
export async function checkRateLimit(db: Executor, ipHash: string, now: Date): Promise<boolean> {
  await db.delete(formRateLimits).where(lte(formRateLimits.windowStart, new Date(now.getTime() - WINDOW_MS)));
  const [row] = await db
    .insert(formRateLimits)
    .values({ ipHash, windowStart: now, count: 1 })
    .onConflictDoUpdate({ target: formRateLimits.ipHash, set: { count: sql`${formRateLimits.count} + 1` } })
    .returning({ count: formRateLimits.count });
  return (row?.count ?? 1) <= MAX_SUBMISSIONS_PER_HOUR;
}
