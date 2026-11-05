"use client";

import { Crown } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Flag } from "@/components/ui-gc/flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BoutLevel } from "@/domain/bout-enums";
import { FighterPicker, type PickedFighter } from "@/features/events/components/fighter-picker";
import { searchEligibleFightersAction, vacateTitleAction } from "../actions";
import type { EditorFighter } from "../dto";
import type { TitleChangePrompt } from "../title-change";
import { TitleChangeDialog } from "./title-change-dialog";

type ChampionPickerProps = {
  level: BoutLevel;
  divisionId: string;
  divisionLabel: string;
  champion: EditorFighter | null;
};

/** El campeón actual de la división y el nivel: se corona a otro (con confirmación) o se deja el título vacante. */
export function ChampionPicker({ level, divisionId, divisionLabel, champion }: ChampionPickerProps) {
  const [choosing, setChoosing] = useState(false);
  const [prompt, setPrompt] = useState<TitleChangePrompt | null>(null);
  const [confirmingVacate, setConfirmingVacate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const search = useCallback((query: string) => searchEligibleFightersAction({ level, divisionId }, query), [level, divisionId]);

  function chosen(picked: PickedFighter | null) {
    if (!picked) return;
    setChoosing(false);
    setPrompt({
      candidate: { divisionId, level, newChampionId: picked.id },
      newChampionName: picked.name ?? picked.label,
      divisionLabel,
      currentChampionName: champion?.name ?? null,
    });
  }

  function vacate() {
    setError(null);
    startTransition(async () => {
      const result = await vacateTitleAction(level, divisionId);
      if (result.error) return setError(result.error);
      setConfirmingVacate(false);
      toast.success(result.success ?? "Título vacante");
    });
  }

  return (
    <section aria-labelledby="champion-title" className="flex flex-col gap-3 border border-border bg-card p-3">
      <h2 id="champion-title" className="text-lg font-semibold">
        Campeón {level === "pro" ? "pro" : "amateur"}
      </h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {champion ? (
          <p className="flex min-w-0 flex-1 basis-56 flex-wrap items-center gap-2">
            <Crown aria-hidden className="size-4 text-accent-bright" />
            <Flag code={champion.nationality} />
            <span className="font-medium break-words">{champion.name}</span>
            {champion.hiddenNote ? <Badge variant="destructive">{champion.hiddenNote}: deja vacante el título</Badge> : null}
          </p>
        ) : (
          <p className="min-w-0 flex-1 basis-56 text-muted-foreground">Título vacante.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => setChoosing((open) => !open)} aria-expanded={choosing}>
            {champion ? "Cambiar campeón" : "Coronar campeón"}
          </Button>
          {champion ? (
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirmingVacate((open) => !open)} aria-expanded={confirmingVacate}>
              Dejar vacante
            </Button>
          ) : null}
        </div>
      </div>

      {choosing ? (
        <FighterPicker
          label="Nuevo campeón"
          value={null}
          onChange={chosen}
          busyIds={champion ? [champion.id] : []}
          busyLabel="Ya es el campeón"
          search={search}
          emptyText="Ningún boxeador elegible coincide: debe estar activo, publicado, del género de la división y con peleas (o récord) del nivel."
        />
      ) : null}

      {confirmingVacate ? (
        <div role="group" aria-label="Confirmar título vacante" className="flex flex-col gap-2 border border-border p-3">
          <p className="text-sm">
            El título de {divisionLabel} queda sin campeón. El ranking no cambia: {champion?.name} deja de mostrarse como campeón y puedes ubicarlo en el ranking si corresponde.
          </p>
          <div>
            <Button type="button" variant="destructive" disabled={isPending} onClick={vacate}>
              Sí, dejar vacante
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {prompt ? <TitleChangeDialog prompt={prompt} onConfirm={() => setPrompt(null)} onSkip={() => setPrompt(null)} /> : null}
    </section>
  );
}
