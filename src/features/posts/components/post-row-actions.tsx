"use client";

import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FormActionState } from "@/lib/form-errors";
import { adminPath } from "@/lib/site-urls";
import { deletePostAction, setPostPublicationAction } from "../actions";

type PostRowActionsProps = {
  id: string;
  title: string;
  status: "draft" | "scheduled" | "published";
  /** Enlace absoluto a la noticia en el sitio (solo si ya es pública). */
  siteHref: string | null;
};

/** Acciones frecuentes de una fila: editar, publicar o pasar a borrador, ver en el sitio y enviar a la papelera (con confirmación). */
export function PostRowActions({ id, title, status, siteHref }: PostRowActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(task: () => Promise<FormActionState>) {
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
        <Link href={adminPath(`/noticias/${id}`)} aria-label={`Editar ${title}`}>
          <Pencil aria-hidden /> Editar
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        aria-label={`${publishing ? "Publicar" : "Pasar a borrador"} ${title}`}
        onClick={() => run(() => setPostPublicationAction(id, { status: publishing ? "published" : "draft", publishAt: null }))}
      >
        {publishing ? "Publicar" : "Pasar a borrador"}
      </Button>
      {siteHref ? (
        <Button asChild variant="outline">
          <a href={siteHref} target="_blank" rel="noopener noreferrer" aria-label={`Ver en el sitio ${title}`}>
            <ExternalLink aria-hidden /> Ver en el sitio
          </a>
        </Button>
      ) : null}
      <Button type="button" variant="destructive" disabled={isPending} aria-label={`Enviar a la papelera ${title}`} onClick={() => setConfirming(true)}>
        Papelera
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a la papelera</DialogTitle>
            <DialogDescription>
              «{title}» dejará de verse en el sitio. Puedes restaurarla desde la Papelera durante 30 días; después se elimina para siempre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => run(() => deletePostAction(id))}>
              Enviar a la papelera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
