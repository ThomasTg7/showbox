"use client";

import { useId } from "react";
import { FormField, formFieldErrorId } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  DECISION_TYPE_LABELS,
  DECISION_TYPES,
  KO_TKO_TYPE_LABELS,
  KO_TKO_TYPES,
  NC_REASON_LABELS,
  selectableNcReasons,
} from "@/domain/bout-enums";
import { formatClock } from "@/domain/clock";
import { scorecardRoundCount, type ResultDraft } from "../result-draft";
import { ScorecardsEditor } from "./scorecards-editor";

export type ResultBoutInfo = { redName: string; blueName: string; scheduledRounds: number; roundSeconds: number };

type ResultMethodFieldsProps = {
  draft: ResultDraft;
  errors: Record<string, string>;
  bout: ResultBoutInfo;
  onChange: (patch: Partial<ResultDraft>) => void;
  onSuggest: () => string | null;
};

/** Los datos que dependen del método (tipo de KO, técnica, tipo de decisión, motivo) y el round y el tiempo. */
export function ResultMethodFields({ draft, errors, bout, onChange, onSuggest }: ResultMethodFieldsProps) {
  const uid = useId();
  const { method } = draft;
  const aria = (field: string) => ({ "aria-invalid": errors[field] ? true : undefined, "aria-describedby": errors[field] ? formFieldErrorId(`${uid}-${field}`) : undefined });
  const isDecision = method === "decision" || method === "technical_decision";
  // Una decisión termina en el último round y con el tiempo completo: no se pregunta. Lo demás sí.
  const asksRoundAndTime = method !== "" && method !== "decision";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {method === "ko_tko" ? (
        <FormField id={`${uid}-koTkoType`} label="Tipo de KO/TKO" error={errors.koTkoType}>
          <NativeSelect id={`${uid}-koTkoType`} value={draft.koTkoType} onChange={(event) => onChange({ koTkoType: event.target.value as ResultDraft["koTkoType"] })} {...aria("koTkoType")}>
            <option value="">Elige el tipo</option>
            {KO_TKO_TYPES.map((type) => (
              <option key={type} value={type}>
                {KO_TKO_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      ) : null}


      {isDecision ? (
        <FormField id={`${uid}-decisionType`} label="Tipo de decisión" error={errors.decisionType}>
          <NativeSelect id={`${uid}-decisionType`} value={draft.decisionType} onChange={(event) => onChange({ decisionType: event.target.value as ResultDraft["decisionType"] })} {...aria("decisionType")}>
            <option value="">Elige el tipo</option>
            {DECISION_TYPES.map((type) => (
              <option key={type} value={type}>
                {DECISION_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      ) : null}

      {method === "disqualification" ? (
        <FormField id={`${uid}-dqReason`} label="Motivo de la descalificación" error={errors.dqReason}>
          <Input id={`${uid}-dqReason`} value={draft.dqReason} maxLength={200} onChange={(event) => onChange({ dqReason: event.target.value })} placeholder="Ej.: golpe bajo reiterado" autoComplete="off" {...aria("dqReason")} />
        </FormField>
      ) : null}

      {method === "no_contest" ? (
        <>
          <FormField id={`${uid}-ncReason`} label="Motivo" error={errors.ncReason}>
            <NativeSelect id={`${uid}-ncReason`} value={draft.ncReason} onChange={(event) => onChange({ ncReason: event.target.value as ResultDraft["ncReason"] })} {...aria("ncReason")}>
              <option value="">Elige el motivo</option>
              {selectableNcReasons(draft.ncReason).map((reason) => (
                <option key={reason} value={reason}>
                  {NC_REASON_LABELS[reason]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id={`${uid}-ncNote`} label="Nota (opcional)" error={errors.ncNote}>
            <Input id={`${uid}-ncNote`} value={draft.ncNote} maxLength={200} onChange={(event) => onChange({ ncNote: event.target.value })} autoComplete="off" />
          </FormField>
        </>
      ) : null}

      {asksRoundAndTime ? (
        <>
          <FormField id={`${uid}-endRound`} label="Round" error={errors.endRound}>
            <NativeSelect id={`${uid}-endRound`} value={draft.endRound} onChange={(event) => onChange({ endRound: event.target.value })} {...aria("endRound")}>
              <option value="">{method === "technical_decision" ? "Último round" : "Elige el round"}</option>
              {Array.from({ length: bout.scheduledRounds }, (_, index) => index + 1).map((round) => (
                <option key={round} value={String(round)}>
                  {round}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id={`${uid}-endTimeSeconds`} label="Tiempo (m:ss)" error={errors.endTimeSeconds} hint={`Del round, hasta ${formatClock(bout.roundSeconds)}. Ej.: 3:42`}>
            <Input
              id={`${uid}-endTimeSeconds`}
              value={draft.endTime}
              onChange={(event) => onChange({ endTime: event.target.value })}
              placeholder="3:42"
              autoComplete="off"
              inputMode="text"
              {...aria("endTimeSeconds")}
            />
          </FormField>
        </>
      ) : null}

      {method !== "" ? (
        <div className="md:col-span-2">
          <ScorecardsEditor
            cards={draft.scorecards}
            mode={draft.scorecardMode}
            roundCount={scorecardRoundCount(draft, bout)}
            redName={bout.redName}
            blueName={bout.blueName}
            error={errors.scorecards}
            onChange={(scorecards) => onChange({ scorecards })}
            onModeChange={(scorecardMode) => onChange({ scorecardMode })}
            // Sugerir el resultado desde las tarjetas solo tiene sentido en una decisión.
            onSuggest={isDecision ? onSuggest : undefined}
            hint={isDecision ? undefined : "Opcional: cómo iban las tarjetas hasta que terminó la pelea (los rounds ya terminados)."}
          />
        </div>
      ) : null}
    </div>
  );
}
