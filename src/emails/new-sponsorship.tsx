import type { SponsorshipData } from "@/features/inbox/schema";
import { InboxNotificationEmail, presentRows } from "./inbox-notification";

type NewSponsorshipEmailProps = { sponsorship: SponsorshipData; inboxUrl: string };

/** Aviso de un contacto de patrocinio nuevo. */
export function NewSponsorshipEmail({ sponsorship, inboxUrl }: NewSponsorshipEmailProps) {
  const rows = presentRows([
    { label: "Empresa", value: sponsorship.company },
    { label: "Contacto", value: sponsorship.contactName },
    { label: "Correo", value: sponsorship.email },
    { label: "Teléfono", value: sponsorship.phone },
    { label: "Mensaje", value: sponsorship.message },
  ]);
  return <InboxNotificationEmail title={`Contacto de patrocinio: ${sponsorship.company}`} rows={rows} inboxUrl={inboxUrl} />;
}
