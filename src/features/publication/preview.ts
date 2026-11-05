import { createHmac, timingSafeEqual } from "node:crypto";

export type PreviewEntity = "fighter" | "event" | "post";

const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

function sign(payload: string): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno BETTER_AUTH_SECRET");
  return createHmac("sha256", secret).update(`preview:${payload}`).digest();
}

/** Enlace de vista previa de un borrador: firmado (HMAC) para una entidad concreta y válido 1 hora. */
export function createPreviewToken(entity: PreviewEntity, id: string, now: Date = new Date()): string {
  const payload = Buffer.from(JSON.stringify({ entity, id, expiresAt: now.getTime() + TOKEN_LIFETIME_MS })).toString("base64url");
  return `${payload}.${sign(payload).toString("base64url")}`;
}

/** `expected` liga el token a una entidad: uno emitido para un boxeador no abre un evento ni otro boxeador. */
export function verifyPreviewToken(
  token: string,
  expected?: { entity: PreviewEntity; id: string },
  now: Date = new Date(),
): boolean {
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0) return false;

  const received = Buffer.from(signature, "base64url");
  const valid = sign(payload);
  if (received.length !== valid.length || !timingSafeEqual(received, valid)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { entity?: string; id?: string; expiresAt?: number };
    if (typeof data.expiresAt !== "number" || data.expiresAt < now.getTime()) return false;
    return !expected || (data.entity === expected.entity && data.id === expected.id);
  } catch {
    return false;
  }
}
