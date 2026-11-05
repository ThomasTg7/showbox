"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Division } from "@/db/schema/divisions";
import { DivisionRow } from "./division-row";

export type DivisionGroupProps = {
  divisions: Division[];
  disabled: boolean;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (division: Division) => void;
  onToggle: (division: Division, active: boolean) => void;
};

/** Lista ordenable de un género. Se carga de forma diferida: dnd-kit solo pesa aquí. */
export default function DivisionGroup({ divisions, disabled, onReorder, onEdit, onToggle }: DivisionGroupProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(from: number, to: number) {
    onReorder(arrayMove(divisions, from, to).map((division) => division.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    move(divisions.findIndex((division) => division.id === active.id), divisions.findIndex((division) => division.id === over.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={divisions.map((division) => division.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {divisions.map((division, index) => (
            <DivisionRow
              key={division.id}
              division={division}
              position={index}
              total={divisions.length}
              disabled={disabled}
              onMove={(delta) => move(index, index + delta)}
              onEdit={() => onEdit(division)}
              onToggle={(active) => onToggle(division, active)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
