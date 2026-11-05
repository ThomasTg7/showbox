"use client";

import { ExternalLink } from "lucide-react";
import { useId, useState } from "react";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { fromLocalInputs, toLocalInputs } from "@/lib/local-time";
import type { PublicationValue } from "../schedule";
import { PublicationBadge } from "./publication-badge";

type PublicationControlsProps = PublicationValue & {
  onChange?: (value: PublicationValue) => void;
  /**
   * Enlace de vista previa (con su token) o una función que lo pide al servidor al hacer clic:
   * el token dura 1 hora y un formulario puede quedar abierto más tiempo. Sin él, se pide guardar primero.
   */
  previewHref?: string | (() => Promise<string | null>);
};

const OPTIONS = [
  { value: "draft", label: "Borrador", hint: "Nadie más lo ve" },
  { value: "scheduled", label: "Programar", hint: "Se publica solo en la fecha elegida" },
  { value: "published", label: "Publicado", hint: "Visible en el sitio ahora" },
] as const;

/** Selector Borrador / Programar / Publicado con fecha y hora en horario de Ecuador. Envía `status` y `publishAt` con el formulario. */
export function PublicationControls({ status: initialStatus, publishAt: initialPublishAt, onChange, previewHref }: PublicationControlsProps) {
  const groupId = useId();
  const initialInputs = initialPublishAt ? toLocalInputs(initialPublishAt) : { date: "", time: "" };
  const [status, setStatus] = useState(initialStatus);
  const [date, setDate] = useState(initialInputs.date);
  const [time, setTime] = useState(initialInputs.time);
  const [opening, setOpening] = useState(false);

  const publishAt = status === "scheduled" ? fromLocalInputs(date, time) : null;
  const missingSchedule = status === "scheduled" && publishAt === null;

  function update(next: { status?: PublicationValue["status"]; date?: string; time?: string }) {
    const nextStatus = next.status ?? status;
    const nextDate = next.date ?? date;
    const nextTime = next.time ?? time;
    setStatus(nextStatus);
    setDate(nextDate);
    setTime(nextTime);
    onChange?.({ status: nextStatus, publishAt: nextStatus === "scheduled" ? fromLocalInputs(nextDate, nextTime) : null });
  }

  async function openPreview() {
    if (typeof previewHref !== "function") return;
    // La pestaña se abre en el clic (los navegadores bloquean las que se abren tras una espera).
    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const href = await previewHref();
      if (href && tab) tab.location.href = href;
      else tab?.close();
    } finally {
      setOpening(false);
    }
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Publicación</legend>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Estado actual:</span>
        <PublicationBadge status={status} publishAt={publishAt} />
      </div>

      <div role="radiogroup" aria-label="Cómo se publica" className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <div
            key={option.value}
            className="relative flex min-h-11 flex-col gap-0.5 border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
          >
            {/* La etiqueta se estira sobre toda la tarjeta (after) para que se pueda tocar en cualquier parte. */}
            <label className="flex cursor-pointer items-center gap-2 font-medium after:absolute after:inset-0">
              <input
                type="radio"
                name={`${groupId}-status`}
                value={option.value}
                checked={status === option.value}
                onChange={() => update({ status: option.value })}
                aria-describedby={`${groupId}-${option.value}-hint`}
                className="relative z-10 accent-primary"
              />
              {option.label}
            </label>
            <span id={`${groupId}-${option.value}-hint`} className="text-xs text-muted-foreground">
              {option.hint}
            </span>
          </div>
        ))}
      </div>

      {status === "scheduled" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${groupId}-date`}>Fecha</Label>
            <Input id={`${groupId}-date`} type="date" value={date} onChange={(event) => update({ date: event.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${groupId}-time`}>Hora</Label>
            <Input id={`${groupId}-time`} type="time" value={time} onChange={(event) => update({ time: event.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">Hora de Ecuador (Quito).</p>
          {missingSchedule ? (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              Elige fecha y hora
            </p>
          ) : null}
        </div>
      ) : null}

      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="publishAt" value={publishAt?.toISOString() ?? ""} />

      <div className="flex flex-col gap-1">
        {typeof previewHref === "string" ? (
          <a href={previewHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
            <ExternalLink aria-hidden /> Vista previa
          </a>
        ) : previewHref ? (
          <Button type="button" variant="outline" className="self-start" disabled={opening} onClick={openPreview}>
            <ExternalLink aria-hidden /> Vista previa
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Guarda primero para poder ver la vista previa.</p>
        )}
        <p className="text-xs text-muted-foreground">La vista previa muestra la página como se verá y sirve durante 1 hora.</p>
      </div>
    </fieldset>
  );
}
