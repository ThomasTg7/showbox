"use client";

import { toScheduledRounds } from "@/domain/bout-enums";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TitleChangeDialog } from "@/features/rankings/components/title-change-dialog";
import type { TitleChangePrompt } from "@/features/rankings/title-change";
import type { AdminBout } from "@/features/events/admin-card-queries";
import { clearBoutResultAction, overturnResultAction, recordBoutResultAction, type RecordResultState } from "../actions";
import { draftFromResult, EMPTY_DRAFT } from "../result-draft";
import { ResultForm } from "./result-form";

type BoutResultDialogProps = {
  bout: AdminBout | null;
  onClose: () => void;
};

/** Registra o corrige el resultado de una pelea; con un resultado guardado también permite borrarlo o anularlo. */
export function BoutResultDialog({ bout, onClose }: BoutResultDialogProps) {
  // La pregunta del cambio de título vive aquí (no en `Content`): el diálogo del resultado se cierra al guardar.
  const [titleChange, setTitleChange] = useState<TitleChangePrompt | null>(null);
  return (
    <>
      <Dialog open={bout !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {bout ? <Content key={bout.id} bout={bout} onClose={onClose} onTitleChange={setTitleChange} /> : null}
        </DialogContent>
      </Dialog>
      {titleChange ? <TitleChangeDialog prompt={titleChange} onConfirm={() => setTitleChange(null)} onSkip={() => setTitleChange(null)} /> : null}
    </>
  );
}

type ContentProps = { bout: AdminBout; onClose: () => void; onTitleChange: (prompt: TitleChangePrompt) => void };

function Content({ bout, onClose, onTitleChange }: ContentProps) {
  const [isPending, startTransition] = useTransition();
  // Borrar y anular piden confirmar en el mismo diálogo; solo una de las dos a la vez.
  const [confirming, setConfirming] = useState<"clear" | "overturn" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const redName = bout.red.lastName;
  const blueName = bout.blue.lastName;
  const isOverturned = bout.result?.ncReason === "overturned";

  function saved(state: RecordResultState) {
    toast.success(state.success ?? "Resultado guardado");
    if (state.titleChange) onTitleChange(state.titleChange);
    onClose();
  }

  function run(task: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const result = await task();
      if (result.error) return setError(result.error);
      toast.success(result.success ?? "Listo");
      onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {bout.result ? "Corregir resultado" : "Registrar resultado"}: {redName} vs {blueName}
        </DialogTitle>
        <DialogDescription>{bout.resultLine ?? "Elige quién ganó y cómo terminó. Solo se piden los datos que corresponden."}</DialogDescription>
      </DialogHeader>

      <ResultForm
        bout={{ id: bout.id, redName, blueName, scheduledRounds: toScheduledRounds(bout.scheduledRounds), roundSeconds: bout.roundSeconds }}
       
        initial={bout.result ? draftFromResult(bout.result) : EMPTY_DRAFT}
        onSubmit={(input) => recordBoutResultAction(bout.id, input)}
        onSaved={saved}
        actions={
          bout.result ? (
            <>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirming((current) => (current === "clear" ? null : "clear"))} aria-expanded={confirming === "clear"}>
                Borrar resultado
              </Button>
              {isOverturned ? null : (
                <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirming((current) => (current === "overturn" ? null : "overturn"))} aria-expanded={confirming === "overturn"}>
                  Anular resultado
                </Button>
              )}
            </>
          ) : null
        }
      />

      {confirming === "clear" ? (
        <div role="group" aria-label="Confirmar el borrado" className="flex flex-col gap-2 border border-border p-3">
          <p className="text-sm">La pelea vuelve a quedar pendiente y este resultado deja de contar en los récords. Se pierde lo escrito (método, tiempo y tarjetas).</p>
          <div>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => run(() => clearBoutResultAction(bout.id))}>
              Sí, borrar el resultado
            </Button>
          </div>
        </div>
      ) : null}
      {confirming === "overturn" ? (
        <div className="flex flex-col gap-2 border border-border p-3">
          <label htmlFor="overturn-note" className="text-sm font-medium">
            ¿Por qué se anula? (queda como «sin resultado» y se conserva el original)
          </label>
          <Input id="overturn-note" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: dopaje del ganador" autoComplete="off" />
          <div>
            <Button type="button" variant="destructive" disabled={isPending || note.trim() === ""} onClick={() => run(() => overturnResultAction(bout.id, note))}>
              Confirmar anulación
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}
