"use client";

import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventStatus } from "@/domain/bout-enums";
import { TitleChangeDialog } from "@/features/rankings/components/title-change-dialog";
import type { TitleChangePrompt } from "@/features/rankings/title-change";
import { EVENT_STATUS_LABELS } from "@/domain/bout-enums";
import { startLiveEventAction, type RecordResultState } from "../actions";
import { BoutResultDialog } from "./bout-result-dialog";
import { LiveCurrentBout, type LiveBout } from "./live-current-bout";
import { LiveNightGate } from "./live-night-gate";

type LiveConsoleProps = {
  eventId: string;
  eventName: string;
  eventStatus: EventStatus;
  /** ¿Ya es la noche del evento (desde 12 h antes del inicio)? Solo entonces abrir la consola lo pone en vivo. */
  isNight: boolean;
  startsLabel: string;
  /** Las peleas por pelear, en el orden de la noche (la primera es la de ahora). */
  pending: LiveBout[];
  /** Las ya peleadas, la más reciente primero. */
  finished: LiveBout[];
  cancelled: LiveBout[];
  cardHref: string;
  publicHref: string;
};

/**
 * Noche de pelea: pantalla de celular para cargar resultados en vivo. Abrirla la noche del evento lo pone «en vivo» (antes,
 * con un botón); cada resultado guardado se ve en el sitio en el siguiente refresco (≤ 30 s) y la consola pasa sola a la
 * pelea siguiente.
 */
export function LiveConsole({ eventId, eventName, eventStatus, isNight, startsLabel, pending, finished, cancelled, cardHref, publicHref }: LiveConsoleProps) {
  // Ids guardados en esta sesión: se ocultan al instante, sin esperar a que el servidor devuelva la lista nueva.
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [titleChange, setTitleChange] = useState<TitleChangePrompt | null>(null);
  // La noche del evento (o el botón) lo pone en vivo: se muestra ya así, sin esperar la respuesta del servidor.
  const startsLive = eventStatus === "scheduled" && (isNight || opened);
  const status: EventStatus = startsLive ? "live" : eventStatus;

  // Una pelea guardada que el servidor ya devuelve como terminada deja de ocultarse a mano: si después se borra su
  // resultado («Corregir»), vuelve sola a las pendientes. (Ajuste de estado durante el render: converge en una vuelta.)
  const confirmed = [...saved].filter((id) => finished.some((bout) => bout.id === id));
  if (confirmed.length > 0) setSaved(new Set([...saved].filter((id) => !confirmed.includes(id))));

  useEffect(() => {
    if (startsLive) void startLiveEventAction(eventId);
  }, [eventId, startsLive]);

  if (eventStatus === "scheduled" && !startsLive) return <LiveNightGate eventName={eventName} startsLabel={startsLabel} onOpen={() => setOpened(true)} />;

  const remaining = pending.filter((bout) => !saved.has(bout.id));
  const current = remaining[0];
  const totalCount = pending.length + finished.length;
  const allDone = remaining.length === 0;
  const correctingBout = [...finished, ...pending].find((bout) => bout.id === correcting) ?? null;

  function handleSaved(boutId: string, state: RecordResultState) {
    setSaved((previous) => new Set(previous).add(boutId));
    toast.success(state.success ?? "Resultado guardado");
    if (state.titleChange) setTitleChange(state.titleChange);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant={status === "live" ? "default" : "outline"}>{status === "live" ? "● EN VIVO" : EVENT_STATUS_LABELS[status]}</Badge>
        <span className="text-sm text-muted-foreground">{allDone ? "Todas las peleas tienen resultado" : `Pelea ${totalCount - remaining.length + 1} de ${totalCount}`}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={cardHref}>Cartelera</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={publicHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden /> Ver en el sitio
            </a>
          </Button>
        </div>
      </div>

      {current ? (
        <LiveCurrentBout key={current.id} bout={current} remaining={remaining.length} onSaved={handleSaved} />
      ) : (
        <div role="status" className="flex flex-col gap-1 border border-primary bg-card p-5">
          <p className="font-display text-2xl uppercase">{totalCount === 0 ? "No hay peleas en la cartelera" : "La noche terminó"}</p>
          <p className="text-sm text-muted-foreground">
            {totalCount === 0 ? `Arma la cartelera de ${eventName} antes de abrir la noche de pelea.` : `${eventName} quedó finalizado. Puedes corregir cualquier resultado abajo.`}
          </p>
        </div>
      )}

      {finished.length + saved.size > 0 ? (
        <details className="border border-border" open={allDone}>
          <summary className="min-h-11 cursor-pointer px-3 py-3 font-semibold">Peleas terminadas ({finished.length})</summary>
          <ul className="flex flex-col divide-y divide-border">
            {finished.map((bout) => (
              <li key={bout.id} className="flex flex-wrap items-center gap-2 px-3 py-3">
                <span className="min-w-0 flex-1 basis-56 text-sm">{bout.resultLine}</span>
                <Button type="button" variant="outline" onClick={() => setCorrecting(bout.id)} aria-label={`Corregir el resultado de ${bout.red.lastName} vs ${bout.blue.lastName}`}>
                  <Pencil aria-hidden /> Corregir
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {cancelled.length > 0 ? (
        <p className="text-sm text-muted-foreground">Canceladas: {cancelled.map((bout) => `${bout.red.lastName} vs ${bout.blue.lastName}`).join(", ")}.</p>
      ) : null}

      <BoutResultDialog bout={correctingBout} onClose={() => setCorrecting(null)} />
      {titleChange ? <TitleChangeDialog prompt={titleChange} onConfirm={() => setTitleChange(null)} onSkip={() => setTitleChange(null)} /> : null}
    </div>
  );
}
