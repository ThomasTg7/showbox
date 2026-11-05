import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format-date";
import { adminPath } from "@/lib/site-urls";
import type { InboxRow } from "../queries";
import { INBOX_KIND_LABELS, InboxStatusBadge } from "./inbox-labels";

const detailHref = (row: InboxRow) => adminPath(`/bandeja/${row.id}`);

/** Los mensajes de la bandeja: tabla en PC, tarjetas apiladas en celular. Cada uno abre su detalle. */
export function InboxList({ items, filtered }: { items: InboxRow[]; filtered: boolean }) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
        {filtered ? "Ningún mensaje coincide con este filtro." : "Todavía no ha llegado ningún mensaje. Aquí verás las postulaciones «Quiero pelear» y los contactos de patrocinio."}
      </p>
    );
  }

  return (
    <>
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead>De</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Recibido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id} data-message={row.name}>
              <TableCell>
                <InboxStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="font-medium">
                <Link href={detailHref(row)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
                  {row.name}
                </Link>
              </TableCell>
              <TableCell>{INBOX_KIND_LABELS[row.kind]}</TableCell>
              <TableCell className="break-all whitespace-normal">{row.email}</TableCell>
              <TableCell>{formatDateTime(row.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ul className="flex flex-col gap-3 sm:hidden">
        {items.map((row) => (
          <li key={row.id} data-message={row.name}>
            <Link href={detailHref(row)} className="flex min-h-11 flex-col gap-1.5 border border-border bg-card p-4">
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium break-words">{row.name}</span>
                <InboxStatusBadge status={row.status} />
              </span>
              <span className="text-sm text-muted-foreground">
                {INBOX_KIND_LABELS[row.kind]} · {formatDateTime(row.createdAt)}
              </span>
              <span className="text-sm break-all">{row.email}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
