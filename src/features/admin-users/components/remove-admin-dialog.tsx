"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RemoveAdminDialogProps = {
  email: string | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RemoveAdminDialog({ email, pending, onCancel, onConfirm }: RemoveAdminDialogProps) {
  return (
    <Dialog open={email !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quitar acceso</DialogTitle>
          <DialogDescription>
            {email} ya no podrá entrar al panel y se cerrarán sus sesiones abiertas. Puedes volver a darle acceso
            cuando quieras.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            Quitar acceso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
