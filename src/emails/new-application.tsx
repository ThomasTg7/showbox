import { formatDate } from "@/lib/format-date";
import type { FighterApplicationData } from "@/features/inbox/schema";
import { InboxNotificationEmail, presentRows } from "./inbox-notification";

type NewApplicationEmailProps = { application: FighterApplicationData; inboxUrl: string };

/** Aviso de una postulación «Quiero pelear» nueva. */
export function NewApplicationEmail({ application, inboxUrl }: NewApplicationEmailProps) {
  const rows = presentRows([
    { label: "Nombre", value: application.name },
    { label: "Correo", value: application.email },
    { label: "Teléfono", value: application.phone },
    { label: "Fecha de nacimiento", value: formatDate(new Date(`${application.birthDate}T12:00:00Z`)) },
    { label: "Peso", value: `${String(application.weightKg).replace(".", ",")} kg` },
    { label: "Récord", value: application.record },
    { label: "Gimnasio", value: application.gym },
    { label: "Videos", value: application.videoLinks.join("\n") },
    { label: "Mensaje", value: application.message },
  ]);
  return <InboxNotificationEmail title={`Nueva postulación: ${application.name}`} rows={rows} inboxUrl={inboxUrl} />;
}
