"use client";

import { ClipboardList, Copy, Pencil, Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FormActionState } from "@/lib/form-errors";
import { adminPath } from "@/lib/site-urls";
import { deleteEventAction, duplicateEventAction, setEventPublicationAction } from "../actions";

type EventRowActionsProps = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "published";
};

/** Acciones frecuentes de una fila: editar, cartelera, noche de pelea, publicar, duplicar y enviar a la papelera (con confirmación). */
export function EventRowActions({ id, name, status }: EventRowActionsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(task: () => Promise<FormActionState>) {
    startTransition(async () => {
      const result = await task();
      if (result.error) toast.error(result.error);
      else if (result.success) toast.success(result.success);
      if (result.redirectTo) router.push(result.redirectTo);
      setConfirming(false);
    });
  }

  const publishing = status !== "published";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline">
        <Link href={adminPath(`/eventos/${id}`)} aria-label={`Editar ${name}`}>
          <Pencil aria-hidden /> Editar
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={adminPath(`/eventos/${id}/cartelera`)} aria-label={`Cartelera de ${name}`}>
          <ClipboardList aria-hidden /> Cartelera
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={adminPath(`/eventos/${id}/en-vivo`)} aria-label={`Noche de pelea de ${name}`}>
          <Radio aria-hidden /> Noche de pelea
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        aria-label={`${publishing ? "Publicar" : "Pasar a borrador"} ${name}`}
        onClick={() => run(() => setEventPublicationAction(id, { status: publishing ? "published" : "draft", publishAt: null }))}
      >
        {publishing ? "Publicar" : "Pasar a borrador"}
      </Button>
      <Button type="button" variant="outline" disabled={isPending} aria-label={`Duplicar ${name}`} onClick={() => run(() => duplicateEventAction(id))}>
        <Copy aria-hidden /> Duplicar
      </Button>
      <Button type="button" variant="destructive" disabled={isPending} aria-label={`Enviar a la papelera ${name}`} onClick={() => setConfirming(true)}>
        Papelera
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a la papelera</DialogTitle>
            <DialogDescription>
              {name} y su cartelera dejarán de verse en el sitio. Puedes restaurarlo desde la Papelera durante 30 días; después se elimina
              para siempre, con sus peleas y resultados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => run(() => deleteEventAction(id))}>
              Enviar a la papelera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
