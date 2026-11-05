"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setChampionAction } from "../actions";
import type { TitleChangePrompt } from "../title-change";

type TitleChangeDialogProps = {
  prompt: TitleChangePrompt;
  /** Se llama cuando el campeón ya quedó guardado. */
  onConfirm: () => void;
  /** «Ahora no»: no cambia nada (el título se puede coronar después en Rankings y títulos). */
  onSkip: () => void;
};

/** Confirma el cambio de campeón que dejó un resultado: el retador ganó una pelea por el título. */
export function TitleChangeDialog({ prompt, onConfirm, onSkip }: TitleChangeDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { candidate, newChampionName, divisionLabel, currentChampionName } = prompt;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await setChampionAction(candidate.level, candidate.divisionId, candidate.newChampionId);
      if (result.error) return setError(result.error);
      toast.success(`${newChampionName} es el nuevo campeón`);
      onConfirm();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onSkip()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambio de título</DialogTitle>
          <DialogDescription>
            {newChampionName} es el nuevo campeón {candidate.level === "pro" ? "pro" : "amateur"} de {divisionLabel}. ¿Confirmar?
          </DialogDescription>
        </DialogHeader>
        {currentChampionName ? (
          <p className="text-sm text-muted-foreground">
            Hoy el título es de {currentChampionName}. Si sigue activo, pasa al primer puesto del ranking de la división (si el ranking está completo, sale el último); lo puedes mover después.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={onSkip}>
            Ahora no
          </Button>
          <Button type="button" disabled={isPending} onClick={confirm}>
            Confirmar cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
