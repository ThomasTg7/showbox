import { render } from "@react-email/components";
import type { Mailer } from "./types";

// Driver de desarrollo: no envía nada, imprime el correo (con sus enlaces)
// en la terminal de `pnpm dev` para poder probar invitaciones y recuperación.
export function createConsoleMailer(write: (text: string) => void = console.info): Mailer {
  return {
    async send(message) {
      const body = await render(message.react, { plainText: true });
      write(`[correo] Para: ${message.to}\n[correo] Asunto: ${message.subject}\n${body}`);
    },
  };
}
