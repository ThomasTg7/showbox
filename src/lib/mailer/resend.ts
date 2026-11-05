import { Resend } from "resend";
import type { Mailer, MailMessage } from "./types";

type ResendClient = {
  emails: {
    send(payload: {
      from: string;
      to: string;
      subject: string;
      react: MailMessage["react"];
    }): Promise<{ error: { message: string } | null }>;
  };
};

export function createResendMailer(options: { from: string; apiKey?: string; client?: ResendClient }): Mailer {
  const client: ResendClient = options.client ?? new Resend(options.apiKey);

  return {
    async send(message) {
      const { error } = await client.emails.send({
        from: options.from,
        to: message.to,
        subject: message.subject,
        react: message.react,
      });
      if (error) {
        throw new Error(`No se pudo enviar el correo: ${error.message}`);
      }
    },
  };
}
