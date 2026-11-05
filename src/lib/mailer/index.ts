import { createConsoleMailer } from "./console";
import { createResendMailer } from "./resend";
import type { Mailer } from "./types";

export type { Mailer, MailMessage } from "./types";

type MailerEnv = Record<string, string | undefined>;

export function getMailer(env: MailerEnv = process.env): Mailer {
  if (env.MAIL_DRIVER !== "resend") {
    return createConsoleMailer();
  }
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    throw new Error("MAIL_DRIVER=resend requiere RESEND_API_KEY y MAIL_FROM");
  }
  return createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM });
}

/**
 * Un correo que se arma recién al enviar: si falta una variable (`RESEND_API_KEY`, `MAIL_FROM`), falla dentro de `send` y no al
 * construirlo. Quien envía un aviso que no debe perder nada (los formularios públicos) lo atrapa ahí y guarda igual.
 */
export function getLazyMailer(env: MailerEnv = process.env): Mailer {
  return { send: async (message) => getMailer(env).send(message) };
}
