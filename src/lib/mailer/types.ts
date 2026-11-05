import type { ReactElement } from "react";

export type MailMessage = {
  to: string;
  subject: string;
  react: ReactElement;
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
