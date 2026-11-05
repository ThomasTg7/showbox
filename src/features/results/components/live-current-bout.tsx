"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DECISION_TYPE_LABELS,
  DECISION_TYPES,
  KO_TKO_TYPE_LABELS,
  KO_TKO_TYPES,
  METHOD_LABELS,
  NC_REASON_LABELS,
  selectableNcReasons,
  BOUT_LEVEL_LABELS,
  type Method,
  type Outcome,
  toScheduledRounds,
} from "@/domain/bout-enums";
import { formatClock } from "@/domain/clock";
import type { AdminBout } from "@/features/events/admin-card-queries";
import { AdminFighterThumb } from "@/features/events/components/admin-fighter-thumb";
import { recordBoutResultAction, type RecordResultState } from "../actions";
import { EMPTY_DRAFT, draftToInput, methodsForOutcome, setOutcome, type ResultDraft } from "../result-draft";
import { digitsToClock } from "../time-keypad";
import { ChoiceButtons } from "./choice-buttons";
import { LiveTimePad } from "./live-time-pad";

export type LiveBout = AdminBout & { segmentName: string };

type LiveCurrentBoutProps = {
  bout: LiveBout;
  /** Cuántas peleas quedan contando esta (la última cierra la noche). */
  remaining: number;
  onSaved: (boutId: string, state: RecordResultState) => void;
};

const WIN_METHOD_ORDER: Method[] = ["ko_tko", "decision", "technical_decision", "disqualification"];

function measure(bout: LiveBout): string {
  const weight = bout.catchweightKg !== null ? `Peso pactado ${bout.catchweightKg} kg` : bout.divisionName ? `Peso ${bout.divisionName}${bout.divisionGender === "female" ? " fem." : ""}` : "";
  return [weight, `${bout.scheduledRounds} × ${formatClock(bout.roundSeconds)} min`, bout.level === "amateur" ? BOUT_LEVEL_LABELS.amateur : ""].filter(Boolean).join(" · ");
}

/** La pelea de ahora: botones grandes para el resultado, el método, el round y el tiempo, y «Guardar y siguiente». */
export function LiveCurrentBout({ bout, remaining, onSaved }: LiveCurrentBoutProps) {
  const [draft, setDraft] = useState<ResultDraft>(EMPTY_DRAFT);
  const [digits, setDigits] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const ctx = { scheduledRounds: toScheduledRounds(bout.scheduledRounds), roundSeconds: bout.roundSeconds };
  const { method } = draft;
  const isDecision = method === "decision" || method === "technical_decision";
  const asksRoundAndTime = method !== "" && method !== "decision";

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

  function chooseMethod(next: Method) {
    change({ method: next });
  }

  function changeTime(next: string) {
    setDigits(next);
    change({ endTime: digitsToClock(next) });
  }

  function save() {
    const result = draftToInput(draft, ctx);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    startTransition(async () => {
      const state = await recordBoutResultAction(bout.id, result.input);
      const fieldErrors = state.fieldErrors ?? {};
      setErrors(fieldErrors);
      setGeneralError(state.error ?? null);
      if (!state.error && Object.keys(fieldErrors).length === 0) onSaved(bout.id, state);
    });
  }

  const outcomeOptions = [
    { value: "red_win" as const, label: `ROJA · ${bout.red.lastName}`, tone: "red" as const },
    { value: "blue_win" as const, label: `AZUL · ${bout.blue.lastName}`, tone: "blue" as const },
    { value: "draw" as const, label: "EMPATE" },
    { value: "no_contest" as const, label: "SIN RESULTADO" },
  ];
  const allowed = methodsForOutcome(draft.outcome);
  const methodOptions = WIN_METHOD_ORDER.map((value) => ({ value, label: METHOD_LABELS[value], disabled: !allowed.includes(value) }));

  return (
    <section aria-label="Pelea actual" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border border-border bg-card p-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {bout.segmentName}
          {bout.isTitleFight ? " · ★ Pelea por el título" : ""}
        </span>
        <div className="flex items-center gap-3">
          <AdminFighterThumb fighter={bout.red} className="size-14 border-b-4 border-[#D7263D]" />
          <p className="min-w-0 flex-1 text-center font-display text-[clamp(18px,6vw,30px)] leading-none uppercase break-words">
            <span className="text-[#ff5468]">{bout.red.lastName}</span> <span className="text-base text-muted-foreground">vs</span> <span className="text-[#5b9dff]">{bout.blue.lastName}</span>
          </p>
          <AdminFighterThumb fighter={bout.blue} className="size-14 border-b-4 border-[#1E6FD9]" />
        </div>
        <span className="text-sm text-muted-foreground">
          {bout.red.firstName} {bout.red.lastName} (roja) contra {bout.blue.firstName} {bout.blue.lastName} (azul)
        </span>
        <span className="text-sm text-muted-foreground">{measure(bout)}</span>
      </div>

      <ChoiceButtons legend="¿Quién ganó?" options={outcomeOptions} value={draft.outcome} onChange={chooseOutcome} error={errors.outcome} />

      {draft.outcome && draft.outcome !== "no_contest" ? <ChoiceButtons legend="Método" options={methodOptions} value={draft.method} onChange={chooseMethod} error={errors.method} /> : null}

      {method === "ko_tko" ? (
        <ChoiceButtons legend="Tipo de KO/TKO" options={KO_TKO_TYPES.map((value) => ({ value, label: KO_TKO_TYPE_LABELS[value] }))} value={draft.koTkoType} onChange={(koTkoType) => change({ koTkoType })} error={errors.koTkoType} />
      ) : null}


      {isDecision ? (
        <ChoiceButtons legend="Tipo de decisión" columns={3} options={DECISION_TYPES.map((value) => ({ value, label: DECISION_TYPE_LABELS[value] }))} value={draft.decisionType} onChange={(decisionType) => change({ decisionType })} error={errors.decisionType} />
      ) : null}

      {method === "disqualification" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="live-dq" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Motivo de la descalificación
          </label>
          <Input id="live-dq" value={draft.dqReason} maxLength={200} onChange={(event) => change({ dqReason: event.target.value })} placeholder="Ej.: golpe bajo reiterado" autoComplete="off" className="h-12 text-base" aria-invalid={errors.dqReason ? true : undefined} />
          {errors.dqReason ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.dqReason}
            </p>
          ) : null}
        </div>
      ) : null}

      {method === "no_contest" ? (
        <ChoiceButtons legend="Motivo" columns={draft.ncReason === "overturned" ? 3 : 2} options={selectableNcReasons(draft.ncReason).map((value) => ({ value, label: NC_REASON_LABELS[value] }))} value={draft.ncReason} onChange={(ncReason) => change({ ncReason })} error={errors.ncReason} />
      ) : null}

      {asksRoundAndTime ? (
        <>
          <ChoiceButtons
            legend={method === "technical_decision" ? "Round (si no eliges, el último)" : "Round"}
            columns={ctx.scheduledRounds % 4 === 0 ? 4 : ctx.scheduledRounds % 3 === 0 ? 3 : 5}
            options={Array.from({ length: ctx.scheduledRounds }, (_, index) => ({ value: String(index + 1), label: String(index + 1), ariaLabel: `Round ${index + 1}` }))}
            value={draft.endRound}
            onChange={(endRound) => change({ endRound })}
            error={errors.endRound}
          />
          <LiveTimePad digits={digits} maxLabel={formatClock(bout.roundSeconds)} error={errors.endTimeSeconds} onChange={changeTime} />
        </>
      ) : null}

      {errors.scorecards || errors.videoUrl || errors.bonuses ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.scorecards ?? errors.videoUrl ?? errors.bonuses}
        </p>
      ) : null}
      {generalError ? (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      ) : null}

      {/* Fijo abajo: el pulgar lo alcanza sin buscar. */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background p-3">
        <Button type="button" size="lg" className="h-14 w-full text-lg" disabled={isSaving} onClick={save}>
          {isSaving ? "Guardando…" : remaining <= 1 ? "Guardar y terminar la noche" : "Guardar y siguiente"}
        </Button>
      </div>
    </section>
  );
}
