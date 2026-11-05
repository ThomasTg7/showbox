import { BRAND } from "@/domain/brand";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq } from "drizzle-orm";
import { createElement } from "react";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { account } from "@/db/schema/auth";
import { AdminPasswordLinkEmail } from "@/emails/admin-password-link";
import { isEmailAllowed } from "@/features/admin-users/allowlist";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/features/admin-users/password-policy";
import { logAudit } from "@/features/audit/log";
import type { Mailer } from "@/lib/mailer";
import { createAuthHooks } from "./auth-hooks";

const PASSWORD_LINK_TTL_SECONDS = 60 * 60 * 24;

export type GoogleCredentials = { clientId: string; clientSecret: string };

export type CreateAuthOptions = {
  db: Db;
  mailer: Mailer;
  baseURL?: string;
  secret?: string;
  google?: GoogleCredentials;
};

async function hasPassword(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
  return row !== undefined;
}

export function createAuth({ db, mailer, baseURL, secret, google }: CreateAuthOptions) {
  const hooks = createAuthHooks(db);

  return betterAuth({
    baseURL,
    secret,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      // Sin registro público: si no, cualquiera podría registrarse primero con
      // un correo recién agregado a la lista blanca y quedarse con esa cuenta.
      // Los admins entran por invitación (enlace para crear contraseña), por
      // Google o con `scripts/create-admin.ts`.
      disableSignUp: true,
      minPasswordLength: ADMIN_PASSWORD_MIN_LENGTH,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: PASSWORD_LINK_TTL_SECONDS,
      sendResetPassword: async ({ user, url }) => {
        if (!(await isEmailAllowed(db, user.email))) {
          return;
        }
        const kind = (await hasPassword(db, user.id)) ? "reset" : "invitation";
        await mailer.send({
          to: user.email,
          subject:
            kind === "invitation"
              ? `Tu acceso al panel de ${BRAND.name}`
              : `Restablece tu contraseña de ${BRAND.name}`,
          react: createElement(AdminPasswordLinkEmail, { url, kind }),
        });
      },
      onPasswordReset: async ({ user }) => {
        await logAudit(db, {
          actorId: user.id,
          action: "update",
          entityType: "user",
          entityId: user.id,
          summary: "Creó o restableció su contraseña",
        });
      },
    },
    socialProviders: google ? { google } : {},
    // Solo se confía en `baseURL` (el subdominio del panel): el sitio público nunca llama a la API de auth.
    // En serverless la memoria no se comparte entre instancias; en la BD sí.
    rateLimit: { storage: "database" },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            await hooks.beforeUserCreate(user);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            await hooks.beforeSessionCreate(session);
          },
          after: async (session) => {
            await hooks.afterSessionCreate(session);
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
