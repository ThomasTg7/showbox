"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Ban, ClipboardCheck, GripVertical, MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Flag } from "@/components/ui-gc/flag";
import { BOUT_LEVEL_LABELS } from "@/domain/bout-enums";
import { formatClock } from "@/domain/clock";
import type { AdminBout, AdminBoutFighter } from "../admin-card-queries";
import { AdminFighterThumb } from "./admin-fighter-thumb";

export type BoutCardHandlers = {
  onEdit: () => void;
  onResult: () => void;
  onMove: (delta: -1 | 1) => void;
  onMoveToSegment: (segmentId: string) => void;
  onCancel: () => void;
  onReinstate: () => void;
  onDelete: () => void;
};

type BoutCardProps = BoutCardHandlers & {
  bout: AdminBout;
  position: number;
  total: number;
  /** Los otros bloques del evento, para «Mover a». */
  otherSegments: { id: string; name: string }[];
  disabled: boolean;
};

function Corner({ fighter, corner }: { fighter: AdminBoutFighter; corner: "red" | "blue" }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 border-l-4 pl-2 ${corner === "red" ? "border-l-[#D7263D]" : "border-l-[#1E6FD9]"}`}>
      <AdminFighterThumb fighter={fighter} className="size-10" />
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 font-medium">
          <Flag code={fighter.nationality} />
          <span className="break-words">
            {fighter.firstName} {fighter.lastName}
          </span>
        </span>
        {fighter.nickname ? <span className="text-xs text-muted-foreground">«{fighter.nickname}»</span> : null}
      </div>
    </div>
  );
}

function boutSummary(bout: AdminBout): string {
  const measure = bout.catchweightKg !== null ? `Peso pactado ${bout.catchweightKg} kg` : bout.divisionName ? `Peso ${bout.divisionName}${bout.divisionGender === "female" ? " fem." : ""}` : "Sin división";
  return `${measure} · ${bout.scheduledRounds} × ${formatClock(bout.roundSeconds)} min`;
}

/** Una pelea del armador: sus dos esquinas, datos, resultado y las acciones (arrastrar, subir, bajar, mover, cancelar, eliminar). */
export function BoutCard({ bout, position, total, otherSegments, disabled, onEdit, onResult, onMove, onMoveToSegment, onCancel, onReinstate, onDelete }: BoutCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bout.id, disabled });
  const name = `${bout.red.lastName} vs ${bout.blue.lastName}`;
  const cancelled = bout.status === "cancelled";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="bout-card"
      className={`flex flex-col gap-3 border border-border bg-card p-3 ${isDragging ? "relative z-10 opacity-80" : ""} ${cancelled ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-2">
        <Button type="button" variant="ghost" size="icon" className="cursor-grab touch-none" aria-label={`Arrastrar la pelea ${name} para reordenarla`} disabled={disabled} {...attributes} {...listeners}>
          <GripVertical aria-hidden />
        </Button>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <Corner fighter={bout.red} corner="red" />
          <Corner fighter={bout.blue} corner="blue" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{boutSummary(bout)}</span>
        {bout.level === "amateur" ? <Badge variant="outline">{BOUT_LEVEL_LABELS.amateur}</Badge> : null}
        {bout.isTitleFight ? <Badge>★ Por el título · campeón: {bout.championCorner === "red" ? bout.red.lastName : bout.blue.lastName}</Badge> : null}
        {cancelled ? <Badge variant="destructive">Cancelada{bout.cancelReason ? ` · ${bout.cancelReason}` : ""}</Badge> : null}
      </div>

      {bout.resultLine ? <p className="text-sm font-medium">{bout.resultLine}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {cancelled ? null : (
          <Button type="button" variant={bout.resultLine ? "outline" : "default"} disabled={disabled} onClick={onResult} aria-label={`${bout.resultLine ? "Corregir" : "Registrar"} el resultado de ${name}`}>
            <ClipboardCheck aria-hidden /> {bout.resultLine ? "Corregir resultado" : "Resultado"}
          </Button>
        )}
        <Button type="button" variant="outline" disabled={disabled || bout.resultLine !== null} onClick={onEdit} aria-label={`Editar la pelea ${name}`} title={bout.resultLine ? "Borra el resultado para cambiar la pelea" : undefined}>
          <Pencil aria-hidden /> Editar
        </Button>
        <Button type="button" variant="outline" size="icon" disabled={disabled || position === 0} aria-label={`Subir la pelea ${name}`} onClick={() => onMove(-1)}>
          <ArrowUp aria-hidden />
        </Button>
        <Button type="button" variant="outline" size="icon" disabled={disabled || position === total - 1} aria-label={`Bajar la pelea ${name}`} onClick={() => onMove(1)}>
          <ArrowDown aria-hidden />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label={`Más acciones de la pelea ${name}`}>
              <MoreVertical aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {otherSegments.length > 0 ? (
              <>
                <DropdownMenuLabel>Mover a otro bloque</DropdownMenuLabel>
                {otherSegments.map((segment) => (
                  <DropdownMenuItem key={segment.id} onSelect={() => onMoveToSegment(segment.id)}>
                    {segment.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}
            {cancelled ? (
              <DropdownMenuItem onSelect={onReinstate}>
                <RotateCcw aria-hidden /> Reponer pelea
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={onCancel} disabled={bout.resultLine !== null}>
                <Ban aria-hidden /> Cancelar pelea
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onSelect={onDelete} disabled={bout.resultLine !== null}>
              <Trash2 aria-hidden /> Eliminar pelea
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
