"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { Flag } from "@/components/ui-gc/flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EditorFighter } from "../dto";

type RankingRowProps = {
  fighter: EditorFighter;
  position: number;
  total: number;
  disabled: boolean;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
};

/** Un puesto del ranking: arrastrar, subir, bajar y quitar (los botones sirven en pantallas táctiles y con teclado). */
export function RankingRow({ fighter, position, total, disabled, onMove, onRemove }: RankingRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fighter.id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-x-2 gap-y-2 border bg-card p-2 ${fighter.hiddenNote ? "border-destructive" : "border-border"} ${isDragging ? "relative z-10 opacity-80" : ""}`}
    >
      <Button type="button" variant="ghost" size="icon" className="cursor-grab touch-none" aria-label={`Arrastrar a ${fighter.name} para reordenar`} {...attributes} {...listeners}>
        <GripVertical aria-hidden />
      </Button>
      <span className="w-8 text-center font-display text-xl text-accent-bright">
        {position + 1}
      </span>
      <div className="flex min-w-0 flex-1 basis-40 flex-wrap items-center gap-x-2 gap-y-1">
        <Flag code={fighter.nationality} />
        <span className="font-medium break-words">{fighter.name}</span>
        {fighter.hiddenNote ? <Badge variant="destructive">{fighter.hiddenNote}: quítalo</Badge> : null}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" disabled={disabled || position === 0} aria-label={`Subir a ${fighter.name}`} onClick={() => onMove(-1)}>
          <ArrowUp aria-hidden />
        </Button>
        <Button type="button" variant="outline" size="icon" disabled={disabled || position === total - 1} aria-label={`Bajar a ${fighter.name}`} onClick={() => onMove(1)}>
          <ArrowDown aria-hidden />
        </Button>
        <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label={`Quitar a ${fighter.name} del ranking`} onClick={onRemove}>
          <X aria-hidden />
        </Button>
      </div>
    </li>
  );
}
