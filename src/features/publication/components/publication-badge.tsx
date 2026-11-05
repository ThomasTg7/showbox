import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format-date";
import type { PublicationValue } from "../schedule";

/** Estado de publicación en palabras simples, para listados y formularios. */
export function PublicationBadge({ status, publishAt }: PublicationValue) {
  if (status === "published") return <Badge>Publicado</Badge>;
  if (status === "scheduled") {
    return <Badge variant="secondary">{publishAt ? `Programado · ${formatDateTime(publishAt)}` : "Programado"}</Badge>;
  }
  return <Badge variant="outline">Borrador</Badge>;
}
