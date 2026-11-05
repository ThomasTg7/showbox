"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Division } from "@/db/schema/divisions";
import { formatWeight } from "@/domain/units";

type DivisionRowProps = {
  division: Division;
  position: number;
  total: number;
  disabled: boolean;
  onMove: (delta: -1 | 1) => void;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
};

export function DivisionRow({ division, position, total, disabled, onMove, onEdit, onToggle }: DivisionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: division.id, disabled });
  const label = division.name;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 border border-border bg-card p-3 ${isDragging ? "relative z-10 opacity-80" : ""}`}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="cursor-grab touch-none"
        aria-label={`Arrastrar ${label} para reordenar`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden />
      </Button>
      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-medium">
          {division.name}
          {division.active ? null : <Badge variant="outline">Inactiva</Badge>}
        </span>
        <span className="text-sm text-muted-foreground">
          Hasta {formatWeight(division.limitKg)} · {division.rankingSlots} puestos en el ranking
        </span>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {/* La etiqueta entera es el área táctil (44 px): el interruptor solo mide 18. */}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 px-1 text-sm">
          <Switch checked={division.active} disabled={disabled} onCheckedChange={onToggle} aria-label={`Activa: ${label}`} />
          Activa
        </label>
        <Button type="button" variant="outline" size="icon" disabled={disabled || position === 0} aria-label={`Subir ${label}`} onClick={() => onMove(-1)}>
          <ArrowUp aria-hidden />
        </Button>
        <Button type="button" variant="outline" size="icon" disabled={disabled || position === total - 1} aria-label={`Bajar ${label}`} onClick={() => onMove(1)}>
          <ArrowDown aria-hidden />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={onEdit}>
          <Pencil aria-hidden /> Editar
        </Button>
      </div>
    </li>
  );
}
