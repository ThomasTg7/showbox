import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format-date";
import type { AuditLogEntry } from "../queries";

const ACTION_LABELS: Record<string, string> = {
  create: "Creó",
  update: "Editó",
  delete: "Eliminó",
  restore: "Restauró",
  publish: "Publicó",
  result: "Cargó resultado",
  login: "Ingresó",
};

function actorName(entry: AuditLogEntry): string {
  if (entry.actorEmail) {
    return entry.actorEmail;
  }
  return entry.actorId === "system" ? "Sistema" : "Usuario eliminado";
}

export function AuditLogList({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground">Todavía no hay acciones registradas.</p>;
  }

  return (
    <>
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Quién</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
              <TableCell>{actorName(entry)}</TableCell>
              <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
              <TableCell className="whitespace-normal">{entry.summary}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ul className="flex flex-col gap-3 sm:hidden">
        {entries.map((entry) => (
          <li key={entry.id} className="border border-border bg-card p-4 flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              {formatDateTime(entry.createdAt)} · {actorName(entry)}
            </span>
            <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
            <span className="text-sm break-words">{entry.summary}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
