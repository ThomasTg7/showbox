"use client";

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BONUSES, BONUS_LABELS, METHODS, METHOD_LABELS, type Bonus, type Outcome, type ScheduledRounds } from "@/domain/bout-enums";
import type { BoutResultInput } from "@/domain/bout-result";
import { NativeSelect } from "@/components/ui/native-select";
import type { RecordResultState } from "../actions";
import { EMPTY_DRAFT, draftToInput, methodsForOutcome, setOutcome, suggestFromCards, type ResultDraft } from "../result-draft";
import { ResultMethodFields, type ResultBoutInfo } from "./result-method-fields";

type ResultFormProps = {
  bout: ResultBoutInfo & { id: string; scheduledRounds: ScheduledRounds };
  /** Para corregir un resultado ya guardado (`draftFromResult`). */
  initial?: ResultDraft;
  /** Guarda en el servidor; el formulario ya validó con las mismas reglas. */
  onSubmit: (input: BoutResultInput) => Promise<RecordResultState>;
  /** Se llama solo cuando el servidor guardó sin errores. */
  onSaved?: (state: RecordResultState) => void;
  /** Botones extra junto a «Guardar» (borrar o anular el resultado guardado). */
  actions?: ReactNode;
};

const OUTCOMES: { value: Outcome; kind: "red" | "blue" | "neutral" }[] = [
  { value: "red_win", kind: "red" },
  { value: "blue_win", kind: "blue" },
  { value: "draw", kind: "neutral" },
  { value: "no_contest", kind: "neutral" },
];

// Los errores del servidor llegan con el nombre de la columna; el formulario los muestra junto a su campo.
const KNOWN_FIELDS = new Set([
  "outcome",
  "method",
  "koTkoType",
  "decisionType",
  "dqReason",
  "ncReason",
  "ncNote",
  "endRound",
  "endTimeSeconds",
  "scorecards",
  "videoUrl",
  "bonuses",
  "referee",
  "notes",
]);

/** Formulario del resultado de una pelea: solo muestra los campos que corresponden al resultado y al método elegidos. */
export function ResultForm({ bout, initial = EMPTY_DRAFT, onSubmit, onSaved, actions }: ResultFormProps) {
  const uid = useId();
  const [draft, setDraft] = useState<ResultDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const ctx = { scheduledRounds: bout.scheduledRounds, roundSeconds: bout.roundSeconds };
  const allowed = methodsForOutcome(draft.outcome);

  function change(patch: Partial<ResultDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
    setGeneralError(null);
  }

  function chooseOutcome(outcome: Outcome) {
    setDraft((current) => setOutcome(current, outcome));
    setErrors({});
    setGeneralError(null);
  }

  /** Con 3 a 5 tarjetas completas, propone quién ganó y cómo (el resultado y el tipo de decisión). */
  function suggest(): string | null {
    const suggestion = suggestFromCards(draft, ctx);
    if (!suggestion) return "Completa los puntos de todas las tarjetas (al menos tres) para poder sugerirlo.";
    setDraft((current) => ({ ...setOutcome(current, suggestion.outcome), decisionType: suggestion.decisionType }));
    setErrors({});
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = draftToInput(draft, ctx);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    startTransition(async () => {
      const state = await onSubmit(result.input);
      const fieldErrors = state.fieldErrors ?? {};
      setErrors(fieldErrors);
      const unknown = Object.entries(fieldErrors).filter(([field]) => !KNOWN_FIELDS.has(field));
      setGeneralError(state.error ?? unknown[0]?.[1] ?? null);
      if (!state.error && Object.keys(fieldErrors).length === 0) onSaved?.(state);
    });
  }

  const toggleBonus = (bonus: Bonus) =>
    change({ bonuses: draft.bonuses.includes(bonus) ? draft.bonuses.filter((current) => current !== bonus) : [...draft.bonuses, bonus] });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6" aria-label="Resultado de la pelea">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Resultado</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {OUTCOMES.map(({ value, kind }) => (
            <label
              key={value}
              className={`relative flex min-h-11 cursor-pointer flex-col justify-center border border-border p-3 has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 ${
                kind === "red" ? "border-l-4 border-l-[#D7263D] has-[:checked]:border-primary" : kind === "blue" ? "border-l-4 border-l-[#1E6FD9] has-[:checked]:border-primary" : "has-[:checked]:border-primary"
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" name={`${uid}-outcome`} value={value} checked={draft.outcome === value} onChange={() => chooseOutcome(value)} className="size-4 accent-[#E3101F]" />
                {value === "red_win" ? `Gana ${bout.redName}` : value === "blue_win" ? `Gana ${bout.blueName}` : value === "draw" ? "Empate" : "Sin resultado"}
              </span>
              {kind !== "neutral" ? <span className="pl-6 text-xs text-muted-foreground">{kind === "red" ? "Esquina roja" : "Esquina azul"}</span> : null}
            </label>
          ))}
        </div>
        {errors.outcome ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.outcome}
          </p>
        ) : null}
      </fieldset>

      {draft.outcome && draft.outcome !== "no_contest" ? (
        <FormField id={`${uid}-method`} label="Método" error={errors.method}>
          <NativeSelect
            id={`${uid}-method`}
            value={draft.method}
            onChange={(event) => change({ method: event.target.value as ResultDraft["method"] })}
            aria-invalid={errors.method ? true : undefined}
          >
            <option value="">Elige cómo terminó</option>
            {METHODS.filter((method) => method !== "no_contest").map((method) => (
              <option key={method} value={method} disabled={!allowed.includes(method)}>
                {METHOD_LABELS[method]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      ) : null}

      <ResultMethodFields draft={draft} errors={errors} bout={bout} onChange={change} onSuggest={suggest} />

      <details className="border border-border p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Más datos (árbitro, bonos, video y notas)</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <FormField id={`${uid}-referee`} label="Árbitro" error={errors.referee}>
            <Input id={`${uid}-referee`} value={draft.referee} maxLength={80} onChange={(event) => change({ referee: event.target.value })} autoComplete="off" />
          </FormField>
          <FormField id={`${uid}-videoUrl`} label="Enlace al video" error={errors.videoUrl} hint="YouTube, Instagram u otro (https://…)">
            <Input id={`${uid}-videoUrl`} value={draft.videoUrl} maxLength={300} onChange={(event) => change({ videoUrl: event.target.value })} inputMode="url" autoComplete="off" />
          </FormField>
          <fieldset className="flex flex-col gap-1 md:col-span-2">
            <legend className="text-sm font-medium">Bonos</legend>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {BONUSES.map((bonus) => (
                <label key={bonus} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.bonuses.includes(bonus)} onChange={() => toggleBonus(bonus)} className="size-5 accent-[#E3101F]" />
                  {BONUS_LABELS[bonus]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="md:col-span-2">
            <FormField id={`${uid}-notes`} label="Notas" error={errors.notes}>
              <Textarea id={`${uid}-notes`} value={draft.notes} maxLength={600} rows={3} onChange={(event) => change({ notes: event.target.value })} />
            </FormField>
          </div>
        </div>
      </details>

      {generalError ? (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap gap-3 border-t border-border bg-background p-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button type="submit" disabled={isSaving} className="flex-1 sm:flex-none">
          {isSaving ? "Guardando…" : "Guardar resultado"}
        </Button>
        {actions}
      </div>
    </form>
  );
}
