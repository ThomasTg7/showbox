"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminBout, AdminSegment } from "../admin-card-queries";
import { BoutCard, type BoutCardHandlers } from "./bout-card";
import { segmentDropId } from "./card-changes";

type SegmentColumnProps = {
  segment: AdminSegment;
  position: number;
  total: number;
  /** Los otros bloques del evento (para «Mover a»). */
  otherSegments: { id: string; name: string }[];
  disabled: boolean;
  onAddBout: () => void;
  onEdit: () => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  boutHandlers: (bout: AdminBout, position: number) => BoutCardHandlers;
};

/** Un bloque de la cartelera: su encabezado con acciones y la lista de peleas ordenable (también acepta peleas de otros bloques). */
export function SegmentColumn({ segment, position, total, otherSegments, disabled, onAddBout, onEdit, onMove, onDelete, boutHandlers }: SegmentColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: segmentDropId(segment.id) });

  return (
    <section aria-label={`Bloque ${segment.name}`} className={`flex min-w-0 flex-col gap-3 border bg-background p-3 ${isOver ? "border-primary" : "border-border"}`}>
      <header className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 basis-40 flex-col">
          <h2 className="text-lg font-semibold break-words">{segment.name}</h2>
          <span className="text-sm text-muted-foreground">
            {segment.bouts.length === 1 ? "1 pelea" : `${segment.bouts.length} peleas`}
            {segment.startsTime ? ` · desde las ${segment.startsTime}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="icon" disabled={disabled || position === 0} aria-label={`Subir el bloque ${segment.name}`} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="icon" disabled={disabled || position === total - 1} aria-label={`Bajar el bloque ${segment.name}`} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label={`Editar el bloque ${segment.name}`} onClick={onEdit}>
            <Pencil aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled || segment.bouts.length > 0}
            title={segment.bouts.length > 0 ? "Mueve o elimina las peleas para poder eliminar el bloque" : undefined}
            aria-label={`Eliminar el bloque ${segment.name}`}
            onClick={onDelete}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </header>

      <SortableContext items={segment.bouts.map((bout) => bout.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-16 flex-col gap-3">
          {segment.bouts.length === 0 ? (
            <li className="border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Sin peleas. Arrastra una aquí o usa «Agregar pelea».</li>
          ) : (
            segment.bouts.map((bout, index) => (
              <BoutCard key={bout.id} bout={bout} position={index} total={segment.bouts.length} otherSegments={otherSegments} disabled={disabled} {...boutHandlers(bout, index)} />
            ))
          )}
        </ul>
      </SortableContext>

      <div>
        <Button type="button" variant="outline" disabled={disabled} onClick={onAddBout}>
          <Plus aria-hidden /> Agregar pelea
        </Button>
      </div>
    </section>
  );
}
