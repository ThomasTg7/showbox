"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useId } from "react";
import type { EditorFighter } from "../dto";
import { RankingRow } from "./ranking-row";

export type RankingListProps = {
  fighters: EditorFighter[];
  disabled: boolean;
  onChange: (fighters: EditorFighter[]) => void;
};

/** Lista ordenable del ranking. Se carga de forma diferida: dnd-kit solo pesa en esta pantalla. */
export default function RankingList({ fighters, disabled, onChange }: RankingListProps) {
  // Un id estable evita que el servidor y el cliente numeren distinto las descripciones de accesibilidad de dnd-kit.
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function move(from: number, to: number) {
    if (to < 0 || to >= fighters.length) return;
    onChange(arrayMove(fighters, from, to));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    move(
      fighters.findIndex((fighter) => fighter.id === active.id),
      fighters.findIndex((fighter) => fighter.id === over.id),
    );
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fighters.map((fighter) => fighter.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-2" aria-label="Puestos del ranking">
          {fighters.map((fighter, index) => (
            <RankingRow
              key={fighter.id}
              fighter={fighter}
              position={index}
              total={fighters.length}
              disabled={disabled}
              onMove={(delta) => move(index, index + delta)}
              onRemove={() => onChange(fighters.filter((candidate) => candidate.id !== fighter.id))}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
