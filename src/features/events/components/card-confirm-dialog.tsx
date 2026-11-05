"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type CardConfirmation =
  | { kind: "cancel-bout"; boutId: string; label: string }
  | { kind: "delete-bout"; boutId: string; label: string }
  | { kind: "delete-segment"; segmentId: string; label: string }
  | null;

type CardConfirmDialogProps = {
  confirmation: CardConfirmation;
  pending: boolean;
  onConfirm: (confirmation: NonNullable<CardConfirmation>, reason: string) => void;
  onClose: () => void;
};

const COPY = {
  "cancel-bout": { title: "Cancelar la pelea", action: "Cancelar pelea", description: "Queda en la cartelera marcada como cancelada, con su motivo. Puedes reponerla después." },
  "delete-bout": { title: "Eliminar la pelea", action: "Eliminar pelea", description: "Se quita de la cartelera. Los boxeadores quedan libres para otra pelea de este evento." },
  "delete-segment": { title: "Eliminar el bloque", action: "Eliminar bloque", description: "El bloque está vacío; se quita de la cartelera." },
} as const;

/** Confirmación de las acciones que quitan algo de la cartelera; cancelar una pelea pide además el motivo (opcional). */
export function CardConfirmDialog({ confirmation, pending, onConfirm, onClose }: CardConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const copy = confirmation ? COPY[confirmation.kind] : null;

  return (
    <Dialog
      open={confirmation !== null}
      onOpenChange={(open) => {
        if (!open) {
          setReason("");
          onClose();
        }
      }}
    >
      <DialogContent>
        {confirmation && copy ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {copy.title}: {confirmation.label}
              </DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            {confirmation.kind === "cancel-bout" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cancel-reason" className="text-sm font-medium">
                  Motivo (opcional)
                </label>
                <Input id="cancel-reason" value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder="Ej.: lesión de un boxeador" autoComplete="off" />
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Volver
              </Button>
              <Button type="button" variant="destructive" disabled={pending} onClick={() => onConfirm(confirmation, reason)}>
                {copy.action}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
