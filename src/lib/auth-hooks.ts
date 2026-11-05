import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { isEmailAllowed } from "@/features/admin-users/allowlist";
import { logAudit } from "@/features/audit/log";

export const EMAIL_NOT_ALLOWED = "EMAIL_NOT_ALLOWED";

function emailNotAllowed(): APIError {
  // El `code` viaja al cliente (login con contraseña) y al redirect de OAuth
  // (`?error=EMAIL_NOT_ALLOWED`), así la UI muestra el mensaje en español.
  return new APIError("FORBIDDEN", { message: "Este correo no tiene acceso", code: EMAIL_NOT_ALLOWED });
}

export function createAuthHooks(db: Db) {
  async function beforeUserCreate(user: { email: string }): Promise<void> {
    if (!(await isEmailAllowed(db, user.email))) {
      throw emailNotAllowed();
    }
  }

  async function beforeSessionCreate(session: { userId: string }): Promise<void> {
    const [row] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, session.userId));

    if (!row || !(await isEmailAllowed(db, row.email))) {
      throw emailNotAllowed();
    }
  }

  async function afterSessionCreate(session: { userId: string }): Promise<void> {
    await logAudit(db, {
      actorId: session.userId,
      action: "login",
      entityType: "user",
      entityId: session.userId,
      summary: "Inició sesión en el panel",
    });
  }

  return { beforeUserCreate, beforeSessionCreate, afterSessionCreate };
}
