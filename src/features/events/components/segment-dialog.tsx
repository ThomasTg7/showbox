"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveSegmentAction } from "../card-actions";

/** Un bloque nuevo, o uno existente para renombrar y cambiarle la hora. */
export type SegmentDialogTarget = { mode: "add" } | { mode: "edit"; id: string; name: string; startsTime: string } | null;

export function SegmentDialog({ eventId, target, onClose }: { eventId: string; target: SegmentDialogTarget; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{target ? <SegmentForm key={target.mode === "edit" ? target.id : "add"} eventId={eventId} target={target} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  );
}

function SegmentForm({ eventId, target, onClose }: { eventId: string; target: NonNullable<SegmentDialogTarget>; onClose: () => void }) {
  const [name, setName] = useState(target.mode === "edit" ? target.name : "");
  const [time, setTime] = useState(target.mode === "edit" ? target.startsTime : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveSegmentAction(eventId, { id: target.mode === "edit" ? target.id : undefined, name, startsTime: time });
      if (result.error) {
        setGeneralError(result.error);
        setErrors({});
      } else {
        toast.success(result.success ?? "Bloque guardado");
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{target.mode === "add" ? "Agregar bloque" : "Editar bloque"}</DialogTitle>
        <DialogDescription>Un bloque agrupa peleas en la cartelera: «Cartelera estelar», «Preliminares», «Cartelera temprana»…</DialogDescription>
      </DialogHeader>
      <FormField id="segment-name" label="Nombre del bloque" error={errors.name}>
        <Input id="segment-name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Cartelera estelar" autoComplete="off" autoFocus />
      </FormField>
      <FormField id="segment-time" label="Hora de inicio (opcional)" hint="Hora de Ecuador, el día del evento." error={errors.startsTime}>
        <Input id="segment-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
      </FormField>
      {generalError ? (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving || name.trim() === ""}>
          {isSaving ? "Guardando…" : "Guardar bloque"}
        </Button>
      </DialogFooter>
    </form>
  );
}
