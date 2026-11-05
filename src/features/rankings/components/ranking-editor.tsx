"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BoutLevel } from "@/domain/bout-enums";
import { FighterPicker } from "@/features/events/components/fighter-picker";
import { dismissSuggestionAction, saveRankingAction, searchEligibleFightersAction } from "../actions";
import type { EditorFighter } from "../dto";
import { addToDraft, applySuggestionToDraft, isDraftDirty } from "../ranking-draft";
import type { SuggestionItem } from "../suggestions";
import { SuggestionsPanel } from "./suggestions-panel";

const RankingList = dynamic(() => import("./ranking-list"), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />,
});

type RankingEditorProps = {
  scope: { level: BoutLevel; divisionId: string | null; label: string; slots: number };
  /** El ranking vigente, tal como se guardó. */
  initial: EditorFighter[];
  /** La versión vigente: si otra persona guarda mientras se edita, el guardado se rechaza en vez de pisarla. */
  baseVersionId: string | null;
  suggestions: SuggestionItem[];
  /** El campeón de la división no puede estar en el ranking numerado (en libra por libra, `null`). */
  championId: string | null;
};

/**
 * Editor de un ranking: se arma un borrador (arrastrar o subir/bajar, agregar, quitar, aceptar sugerencias) y «Guardar
 * nueva versión» lo publica. Cada guardado crea una versión; la anterior sirve para el movimiento ▲▼.
 */
export function RankingEditor({ scope, initial, baseVersionId, suggestions, championId }: RankingEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState(suggestions);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dirty = isDraftDirty(initial, draft);
  const full = draft.length >= scope.slots;

  // Una función estable: el buscador reinicia su petición cada vez que cambia.
  const search = useCallback((query: string) => searchEligibleFightersAction({ level: scope.level, divisionId: scope.divisionId }, query), [scope.level, scope.divisionId]);

  function accept(suggestion: SuggestionItem) {
    setDraft((current) => applySuggestionToDraft(current, suggestion, scope.slots));
    setPending((current) => current.filter((candidate) => candidate !== suggestion));
    toast.info("Sugerencia aplicada al borrador. Guarda para publicar el cambio.");
  }

  function dismiss(suggestion: SuggestionItem) {
    startTransition(async () => {
      const result = await dismissSuggestionAction(suggestion.eventId, suggestion.fighterId, suggestion.scopeKey);
      if (result.error) return void toast.error(result.error);
      setPending((current) => current.filter((candidate) => candidate !== suggestion));
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveRankingAction(
        { level: scope.level, divisionId: scope.divisionId },
        draft.map((fighter) => fighter.id),
        baseVersionId,
      );
      if (result.error) {
        setError(result.error);
        return void toast.error(result.error);
      }
      toast.success(result.success ?? "Ranking guardado");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <SuggestionsPanel suggestions={pending} disabled={isPending} onAccept={accept} onDismiss={dismiss} />

      <section aria-labelledby="draft-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="draft-title" className="text-lg font-semibold">
            Puestos ({draft.length} de {scope.slots})
          </h2>
          {dirty ? <span className="text-sm text-muted-foreground">Cambios sin guardar</span> : null}
        </div>
        {draft.length === 0 ? (
          <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Este ranking aún no tiene boxeadores. Agrégalos con el buscador de abajo.</p>
        ) : (
          <RankingList fighters={draft} disabled={isPending} onChange={setDraft} />
        )}
        {full ? (
          <p className="text-sm text-muted-foreground">Ya están los {scope.slots} puestos. Quita a alguien para agregar otro boxeador.</p>
        ) : (
          <FighterPicker
            label="Agregar boxeador"
            value={null}
            onChange={(picked) => {
              if (picked) setDraft((current) => addToDraft(current, { id: picked.id, name: picked.name ?? picked.label, nationality: picked.nationality ?? "", hiddenNote: null }, scope.slots));
            }}
            busyIds={[...draft.map((fighter) => fighter.id), ...(championId ? [championId] : [])]}
            busyLabel="Ya está en el ranking o es el campeón"
            search={search}
            emptyText="Ningún boxeador elegible coincide: debe estar activo, publicado, del género de la división y con peleas (o récord) del nivel."
          />
        )}
      </section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap gap-3 border-t border-border bg-background p-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button type="button" className="flex-1 sm:flex-none" disabled={isPending || !dirty} onClick={save}>
          Guardar nueva versión
        </Button>
        <Button type="button" variant="outline" disabled={isPending || !dirty} onClick={() => setDraft(initial)}>
          Descartar cambios
        </Button>
      </div>
    </div>
  );
}
