"use client";

import { adminPath } from "@/lib/site-urls";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteFighterAction, setFighterPublicationAction } from "../actions";

type FighterRowActionsProps = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "published";
};

/** Acciones frecuentes de una fila: editar, publicar o pasar a borrador, y enviar a la papelera (con confirmación). */
export function FighterRowActions({ id, name, status }: FighterRowActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(task: () => ReturnType<typeof deleteFighterAction>) {
    startTransition(async () => {
      const result = await task();
      if (result.error) toast.error(result.error);
      else if (result.success) toast.success(result.success);
      setConfirming(false);
    });
  }

  const publishing = status !== "published";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline">
        <Link href={adminPath(`/boxeadores/${id}`)} aria-label={`Editar ${name}`}>
          <Pencil aria-hidden /> Editar
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        aria-label={`${publishing ? "Publicar" : "Pasar a borrador"} a ${name}`}
        onClick={() => run(() => setFighterPublicationAction(id, { status: publishing ? "published" : "draft", publishAt: null }))}
      >
        {publishing ? "Publicar" : "Pasar a borrador"}
      </Button>
      <Button type="button" variant="destructive" disabled={isPending} aria-label={`Enviar a la papelera a ${name}`} onClick={() => setConfirming(true)}>
        Papelera
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a la papelera</DialogTitle>
            <DialogDescription>
              {name} dejará de verse en el sitio. Puedes restaurarlo desde la Papelera durante 30 días; después se elimina
              para siempre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => run(() => deleteFighterAction(id))}>
              Enviar a la papelera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
