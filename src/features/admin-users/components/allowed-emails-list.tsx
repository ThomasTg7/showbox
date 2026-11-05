"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format-date";
import { removeAllowedEmailAction } from "../actions";
import type { AllowedEmailRow } from "../queries";
import { RemoveAdminDialog } from "./remove-admin-dialog";

type AllowedEmailsListProps = {
  emails: AllowedEmailRow[];
  currentEmail: string;
};

export function AllowedEmailsList({ emails, currentEmail }: AllowedEmailsListProps) {
  const [emailToRemove, setEmailToRemove] = useState<string | null>(null);
  const [isRemoving, startRemoving] = useTransition();

  function confirmRemove() {
    if (!emailToRemove) {
      return;
    }
    const email = emailToRemove;
    startRemoving(async () => {
      const result = await removeAllowedEmailAction(email);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.success);
      }
      setEmailToRemove(null);
    });
  }

  function removeButton(email: string) {
    if (email === currentEmail) {
      return <span className="text-sm text-muted-foreground">Tú</span>;
    }
    return (
      <Button type="button" variant="destructive" disabled={isRemoving} onClick={() => setEmailToRemove(email)}>
        Quitar acceso
      </Button>
    );
  }

  return (
    <>
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead>Correo</TableHead>
            <TableHead>Con acceso desde</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((row) => (
            <TableRow key={row.email}>
              <TableCell>{row.email}</TableCell>
              <TableCell>{formatDate(row.createdAt)}</TableCell>
              <TableCell className="text-right">{removeButton(row.email)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ul className="flex flex-col gap-3 sm:hidden">
        {emails.map((row) => (
          <li key={row.email} className="border border-border bg-card p-4 flex flex-col gap-2">
            <span className="font-medium break-all">{row.email}</span>
            <span className="text-sm text-muted-foreground">Con acceso desde {formatDate(row.createdAt)}</span>
            <div className="self-start">{removeButton(row.email)}</div>
          </li>
        ))}
      </ul>

      <RemoveAdminDialog
        email={emailToRemove}
        pending={isRemoving}
        onCancel={() => setEmailToRemove(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
