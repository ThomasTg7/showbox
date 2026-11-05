import type { ReactElement } from "react";
import type { Db } from "@/db";
import { createAuth } from "@/lib/create-auth";
import type { MailMessage, Mailer } from "@/lib/mailer";

export type SentMail = MailMessage & { props: { url: string; kind: "invitation" | "reset" } };

export function createRecordingMailer(): Mailer & { sent: SentMail[] } {
  const sent: SentMail[] = [];
  return {
    sent,
    async send(message) {
      const props = (message.react as ReactElement<SentMail["props"]>).props;
      sent.push({ ...message, props });
    },
  };
}

export function tokenFromResetUrl(url: string): string {
  const match = url.match(/reset-password\/([^?]+)/);
  if (!match) {
    throw new Error(`URL sin token de restablecimiento: ${url}`);
  }
  return match[1];
}

export function createTestAuth(db: Db, mailer: Mailer) {
  return createAuth({
    db,
    mailer,
    baseURL: "http://localhost:3000",
    secret: "test-secret-for-better-auth-integration-tests",
  });
}
