import { Badge } from "@/components/ui/badge";
import type { InboxKind, InboxStatus } from "../queries";

export const INBOX_KIND_LABELS: Record<InboxKind, string> = { fighter_application: "Quiero pelear", sponsorship: "Patrocinio" };

const STATUS_LABELS: Record<InboxStatus, string> = { new: "Nuevo", contacted: "Contactado", discarded: "Descartado" };

/** El estado del mensaje: «Nuevo» destaca, lo ya atendido se ve apagado. */
export function InboxStatusBadge({ status }: { status: InboxStatus }) {
  if (status === "new") return <Badge>{STATUS_LABELS.new}</Badge>;
  return <Badge variant={status === "contacted" ? "secondary" : "outline"}>{STATUS_LABELS[status]}</Badge>;
}
