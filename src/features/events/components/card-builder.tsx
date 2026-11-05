"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCorners, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useId, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Division } from "@/db/schema/divisions";
import { BoutResultDialog } from "@/features/results/components/bout-result-dialog";
import type { FormActionState } from "@/lib/form-errors";
import type { AdminBout, AdminSegment } from "../admin-card-queries";
import { cancelBoutAction, deleteBoutAction, deleteSegmentAction, moveBoutAction, reinstateBoutAction, reorderSegmentsAction } from "../card-actions";
import { BoutDialog, type BoutDialogTarget } from "./bout-dialog";
import { CardConfirmDialog, type CardConfirmation } from "./card-confirm-dialog";
import { applyChange, isSegmentDropId, resolveDrop } from "./card-changes";
import { SegmentColumn } from "./segment-column";
import { SegmentDialog, type SegmentDialogTarget } from "./segment-dialog";

type CardBuilderProps = {
  eventId: string;
  segments: AdminSegment[];
  divisions: Division[];
};

/**
 * Qué hay debajo de lo que se arrastra. Cada bloque también es una zona de soltado (para los vacíos), pero una pelea
 * gana sobre el bloque que la contiene; con teclado (sin puntero) se usan las esquinas más cercanas, también de peleas.
 */
const detectCollisions: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  const bout = within.find((collision) => !isSegmentDropId(collision.id));
  if (bout) return [bout];
  if (within.length > 0) return within;
  const closest = closestCorners(args);
  const bouts = closest.filter((collision) => !isSegmentDropId(collision.id));
  return bouts.length > 0 ? bouts : closest;
};

const boutLabel = (bout: AdminBout) => `${bout.red.lastName} vs ${bout.blue.lastName}`;

/**
 * Armador de cartelera: bloques con sus peleas, en columnas en computador y apilados en celular. Las peleas se
 * ordenan arrastrando (también entre bloques) o con los botones subir, bajar y «Mover a», que sirven en pantallas
 * táctiles y con teclado.
 */
export function CardBuilder({ eventId, segments, divisions }: CardBuilderProps) {
  const [boutDialog, setBoutDialog] = useState<BoutDialogTarget>(null);
  const [segmentDialog, setSegmentDialog] = useState<SegmentDialogTarget>(null);
  const [resultBoutId, setResultBoutId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CardConfirmation>(null);
  const [isPending, startTransition] = useTransition();
  // Refleja el orden al instante; si la action falla, React vuelve a la cartelera del servidor.
  const [optimistic, applyOptimistic] = useOptimistic(segments, applyChange);

  // Un id estable evita que el servidor y el cliente numeren distinto las descripciones de accesibilidad de dnd-kit.
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const allBouts = optimistic.flatMap((segment) => segment.bouts);
  const fighterIdsInCard = allBouts.filter((bout) => bout.status !== "cancelled").flatMap((bout) => [bout.red.id, bout.blue.id]);
  const resultBout = allBouts.find((bout) => bout.id === resultBoutId) ?? null;

  function report(result: FormActionState) {
    if (result.error) toast.error(result.error);
    else if (result.success) toast.success(result.success);
  }

  function moveBout(boutId: string, segmentId: string, index: number) {
    startTransition(async () => {
      applyOptimistic({ type: "move", boutId, segmentId, index });
      report(await moveBoutAction(boutId, segmentId, index));
    });
  }

  function moveSegment(position: number, delta: -1 | 1) {
    const ids = optimistic.map((segment) => segment.id);
    [ids[position], ids[position + delta]] = [ids[position + delta]!, ids[position]!];
    startTransition(async () => {
      applyOptimistic({ type: "segments", ids });
      report(await reorderSegmentsAction(eventId, ids));
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const translated = active.rect.current.translated;
    const isBelow = translated ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2 : false;
    const drop = resolveDrop(optimistic, String(active.id), String(over.id), isBelow);
    if (drop) moveBout(String(active.id), drop.segmentId, drop.index);
  }

  function confirm(target: NonNullable<CardConfirmation>, reason: string) {
    startTransition(async () => {
      if (target.kind === "cancel-bout") report(await cancelBoutAction(target.boutId, reason));
      else if (target.kind === "delete-bout") report(await deleteBoutAction(target.boutId));
      else report(await deleteSegmentAction(target.segmentId));
      setConfirmation(null);
    });
  }

  const handlersFor = (bout: AdminBout, position: number) => ({
    onEdit: () => setBoutDialog({ mode: "edit", bout }),
    onResult: () => setResultBoutId(bout.id),
    onMove: (delta: -1 | 1) => moveBout(bout.id, bout.segmentId, position + delta),
    onMoveToSegment: (segmentId: string) => moveBout(bout.id, segmentId, Number.MAX_SAFE_INTEGER),
    onCancel: () => setConfirmation({ kind: "cancel-bout", boutId: bout.id, label: boutLabel(bout) }),
    onReinstate: () =>
      startTransition(async () => {
        report(await reinstateBoutAction(bout.id));
      }),
    onDelete: () => setConfirmation({ kind: "delete-bout", boutId: bout.id, label: boutLabel(bout) }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button type="button" onClick={() => setSegmentDialog({ mode: "add" })}>
          <Plus aria-hidden /> Agregar bloque
        </Button>
      </div>

      {optimistic.length === 0 ? (
        <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
          La cartelera está vacía. Agrega un bloque (por ejemplo «Cartelera estelar») y luego sus peleas.
        </p>
      ) : (
        <DndContext id={dndId} sensors={sensors} collisionDetection={detectCollisions} onDragEnd={handleDragEnd}>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {optimistic.map((segment, position) => (
              <SegmentColumn
                key={segment.id}
                segment={segment}
                position={position}
                total={optimistic.length}
                otherSegments={optimistic.filter((other) => other.id !== segment.id).map((other) => ({ id: other.id, name: other.name }))}
                disabled={isPending}
                onAddBout={() => setBoutDialog({ mode: "add", segmentId: segment.id, segmentName: segment.name })}
                onEdit={() => setSegmentDialog({ mode: "edit", id: segment.id, name: segment.name, startsTime: segment.startsTime })}
                onMove={(delta) => moveSegment(position, delta)}
                onDelete={() => setConfirmation({ kind: "delete-segment", segmentId: segment.id, label: segment.name })}
                boutHandlers={handlersFor}
              />
            ))}
          </div>
        </DndContext>
      )}

      <BoutDialog target={boutDialog} divisions={divisions} fighterIdsInCard={fighterIdsInCard} onClose={() => setBoutDialog(null)} />
      <SegmentDialog eventId={eventId} target={segmentDialog} onClose={() => setSegmentDialog(null)} />
      <BoutResultDialog bout={resultBout} onClose={() => setResultBoutId(null)} />
      <CardConfirmDialog confirmation={confirmation} pending={isPending} onConfirm={confirm} onClose={() => setConfirmation(null)} />
    </div>
  );
}
