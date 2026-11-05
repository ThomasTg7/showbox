"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useId } from "react";
import type { AdminSponsorRow } from "../dto";
import { SponsorRow } from "./sponsor-row";

export type SponsorGroupProps = {
  sponsors: AdminSponsorRow[];
  disabled: boolean;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (sponsor: AdminSponsorRow) => void;
  onDelete: (sponsor: AdminSponsorRow) => void;
};

/** Lista ordenable de un nivel (arrastrar, o subir/bajar con botones). Se carga de forma diferida: dnd-kit solo pesa aquí. */
export default function SponsorGroup({ sponsors, disabled, onReorder, onEdit, onDelete }: SponsorGroupProps) {
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function move(from: number, to: number) {
    onReorder(arrayMove(sponsors, from, to).map((sponsor) => sponsor.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    move(sponsors.findIndex((sponsor) => sponsor.id === active.id), sponsors.findIndex((sponsor) => sponsor.id === over.id));
  }

  return (
    // `id` fijo: sin él dnd-kit numera sus accesorios distinto en el servidor y el navegador (error de hidratación).
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sponsors.map((sponsor) => sponsor.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {sponsors.map((sponsor, index) => (
            <SponsorRow
              key={sponsor.id}
              sponsor={sponsor}
              position={index}
              total={sponsors.length}
              disabled={disabled}
              onMove={(delta) => move(index, index + delta)}
              onEdit={() => onEdit(sponsor)}
              onDelete={() => onDelete(sponsor)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
