"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Division } from "@/db/schema/divisions";
import { BOUT_CORNER_LABELS, BOUT_CORNERS, BOUT_LEVEL_LABELS, BOUT_LEVELS, DEFAULT_ROUND_SECONDS, DEFAULT_SCHEDULED_ROUNDS, SCHEDULED_ROUNDS, type BoutCorner, type BoutLevel } from "@/domain/bout-enums";
import type { AdminBout } from "../admin-card-queries";
import { addBoutAction, updateBoutAction } from "../card-actions";
import { FighterPicker, type PickedFighter } from "./fighter-picker";

/** Dónde se agrega la pelea nueva, o cuál se edita. */
export type BoutDialogTarget = { mode: "add"; segmentId: string; segmentName: string } | { mode: "edit"; bout: AdminBout } | null;

type BoutDialogProps = {
  target: BoutDialogTarget;
  divisions: Division[];
  /** Boxeadores que ya están en la cartelera del evento (la pelea que se edita no cuenta contra sí misma). */
  fighterIdsInCard: string[];
  onClose: () => void;
};

type Draft = {
  red: PickedFighter | null;
  blue: PickedFighter | null;
  measure: "division" | "catchweight";
  divisionId: string;
  catchweightKg: string;
  level: BoutLevel;
  rounds: string;
  roundMinutes: string;
  isTitleFight: boolean;
  championCorner: BoutCorner;
};

const fullName = (fighter: AdminBout["red"]) => (fighter.nickname ? `${fighter.firstName} ${fighter.lastName} «${fighter.nickname}»` : `${fighter.firstName} ${fighter.lastName}`);

function initialDraft(target: NonNullable<BoutDialogTarget>): Draft {
  if (target.mode === "add") {
    return { red: null, blue: null, measure: "division", divisionId: "", catchweightKg: "", level: "pro", rounds: String(DEFAULT_SCHEDULED_ROUNDS), roundMinutes: String(DEFAULT_ROUND_SECONDS / 60), isTitleFight: false, championCorner: "red" };
  }
  const { bout } = target;
  return {
    red: { id: bout.red.id, label: fullName(bout.red) },
    blue: { id: bout.blue.id, label: fullName(bout.blue) },
    measure: bout.catchweightKg !== null ? "catchweight" : "division",
    divisionId: bout.divisionId ?? "",
    catchweightKg: bout.catchweightKg === null ? "" : String(bout.catchweightKg),
    level: bout.level,
    rounds: String(bout.scheduledRounds),
    roundMinutes: String(bout.roundSeconds / 60),
    isTitleFight: bout.isTitleFight,
    championCorner: bout.championCorner,
  };
}

/** Diálogo para agregar o editar una pelea: esquinas, división o peso pactado, nivel, rounds y si es por el título. */
export function BoutDialog({ target, divisions, fighterIdsInCard, onClose }: BoutDialogProps) {
  // Se remonta al abrir (por la `key` del contenido) para que el borrador parta desde la pelea elegida.
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {target ? <BoutForm key={target.mode === "edit" ? target.bout.id : `add-${target.segmentId}`} target={target} divisions={divisions} fighterIdsInCard={fighterIdsInCard} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function BoutForm({ target, divisions, fighterIdsInCard, onClose }: { target: NonNullable<BoutDialogTarget>; divisions: Division[]; fighterIdsInCard: string[]; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(target));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const own = target.mode === "edit" ? [target.bout.red.id, target.bout.blue.id] : [];
  const busyIds = fighterIdsInCard.filter((id) => !own.includes(id));
  const selectedDivision = target.mode === "edit" ? target.bout.divisionId : null;
  const shown = divisions.filter((division) => division.active || division.id === selectedDivision);
  const roundMinutes = ["1", "2", "3"];
  // Una pelea guardada con una duración que no es de minutos exactos (p. ej. 90 s) la conserva como opción.
  if (!roundMinutes.includes(draft.roundMinutes)) roundMinutes.push(draft.roundMinutes);

  const change = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
    setGeneralError(null);
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      redFighterId: draft.red?.id ?? "",
      blueFighterId: draft.blue?.id ?? "",
      divisionId: draft.measure === "division" ? draft.divisionId : "",
      catchweightKg: draft.measure === "catchweight" ? draft.catchweightKg : "",
      level: draft.level,
      scheduledRounds: draft.rounds,
      roundSeconds: Math.round(Number(draft.roundMinutes) * 60),
      isTitleFight: draft.isTitleFight,
      championCorner: draft.championCorner,
    };
    startTransition(async () => {
      const result = target.mode === "add" ? await addBoutAction(target.segmentId, input) : await updateBoutAction(target.bout.id, input);
      if (result.fieldErrors) setErrors(result.fieldErrors);
      if (result.error) setGeneralError(result.error);
      if (result.success) {
        toast.success(result.success);
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{target.mode === "add" ? "Agregar pelea" : "Editar pelea"}</DialogTitle>
        <DialogDescription>{target.mode === "add" ? `Se agrega al final de «${target.segmentName}».` : "Cambia los boxeadores o los datos de la pelea."}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <FighterPicker label="Esquina roja" corner="red" value={draft.red} onChange={(red) => change({ red })} busyIds={busyIds} error={errors.redFighterId} />
        <FighterPicker label="Esquina azul" corner="blue" value={draft.blue} onChange={(blue) => change({ blue })} busyIds={busyIds} error={errors.blueFighterId} />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Categoría de la pelea</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["division", "catchweight"] as const).map((measure) => (
            <label key={measure} className="flex min-h-11 cursor-pointer items-center gap-2 border border-border px-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <input type="radio" name="measure" value={measure} checked={draft.measure === measure} onChange={() => change({ measure })} className="size-4 accent-[#E3101F]" />
              {measure === "division" ? "División" : "Peso pactado"}
            </label>
          ))}
        </div>
        {draft.measure === "division" ? (
          <FormField id="bout-division" label="División" error={errors.divisionId}>
            <NativeSelect id="bout-division" value={draft.divisionId} onChange={(event) => change({ divisionId: event.target.value })} aria-invalid={errors.divisionId ? true : undefined}>
              <option value="">Elige la división</option>
              {shown.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                  {division.gender === "female" ? " (femenino)" : ""} · hasta {division.limitKg} kg{division.active ? "" : " (inactiva)"}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        ) : (
          <FormField id="bout-catchweight" label="Peso pactado (kg)" error={errors.catchweightKg ?? errors.divisionId} hint="Ej.: 72,5">
            <Input id="bout-catchweight" value={draft.catchweightKg} inputMode="decimal" onChange={(event) => change({ catchweightKg: event.target.value })} autoComplete="off" aria-invalid={errors.catchweightKg || errors.divisionId ? true : undefined} />
          </FormField>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="bout-level" label="Nivel" error={errors.level}>
          <NativeSelect id="bout-level" value={draft.level} onChange={(event) => change({ level: event.target.value as BoutLevel })}>
            {BOUT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {BOUT_LEVEL_LABELS[level]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="bout-rounds" label="Rounds" error={errors.scheduledRounds}>
          <NativeSelect id="bout-rounds" value={draft.rounds} onChange={(event) => change({ rounds: event.target.value })}>
            {SCHEDULED_ROUNDS.map((rounds) => (
              <option key={rounds} value={rounds}>
                {rounds} rounds{rounds === 3 ? " (amateur)" : rounds === 12 ? " (título)" : ""}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="bout-minutes" label="Duración del round" error={errors.roundSeconds}>
          <NativeSelect id="bout-minutes" value={draft.roundMinutes} onChange={(event) => change({ roundMinutes: event.target.value })}>
            {roundMinutes.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} {minutes === "1" ? "minuto" : "minutos"}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={draft.isTitleFight} onChange={(event) => change({ isTitleFight: event.target.checked })} className="size-5 accent-[#E3101F]" />
        <span>
          <span className="font-medium">Pelea por el título</span>
          <span className="block text-xs text-muted-foreground">Si gana el retador, el panel sugerirá el cambio de campeón.</span>
        </span>
      </label>

      {draft.isTitleFight ? (
        <FormField id="bout-champion" label="¿En qué esquina está el campeón?" error={errors.championCorner}>
          <NativeSelect id="bout-champion" value={draft.championCorner} onChange={(event) => change({ championCorner: event.target.value as BoutCorner })}>
            {BOUT_CORNERS.map((corner) => {
              const fighter = corner === "red" ? draft.red : draft.blue;
              return (
                <option key={corner} value={corner}>
                  {BOUT_CORNER_LABELS[corner]}
                  {fighter ? ` · ${fighter.label}` : ""}
                </option>
              );
            })}
          </NativeSelect>
        </FormField>
      ) : null}

      {generalError ? (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      ) : null}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : target.mode === "add" ? "Agregar pelea" : "Guardar pelea"}
        </Button>
      </DialogFooter>
    </form>
  );
}
