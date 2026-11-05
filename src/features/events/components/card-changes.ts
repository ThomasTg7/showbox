import type { AdminSegment } from "../admin-card-queries";

// Cambios de la cartelera que se reflejan al instante en el armador (antes de que responda el servidor) y la
// traducción de «soltar aquí» al bloque y la posición que espera `moveBoutAction`.

export type CardChange = { type: "move"; boutId: string; segmentId: string; index: number } | { type: "segments"; ids: string[] };

const SEGMENT_PREFIX = "segment:";

export const segmentDropId = (segmentId: string) => `${SEGMENT_PREFIX}${segmentId}`;

export const isSegmentDropId = (id: string | number): boolean => String(id).startsWith(SEGMENT_PREFIX);

/**
 * Aplica el cambio como lo hace el servidor: la pelea sale de su bloque y entra en `index` del destino (contado sin
 * ella; un valor mayor al largo la deja al final). Un cambio que no se entiende deja la cartelera como estaba.
 */
export function applyChange(segments: AdminSegment[], change: CardChange): AdminSegment[] {
  if (change.type === "segments") return change.ids.flatMap((id) => segments.filter((segment) => segment.id === id));

  const moving = segments.flatMap((segment) => segment.bouts).find((bout) => bout.id === change.boutId);
  if (!moving || !segments.some((segment) => segment.id === change.segmentId)) return segments;

  return segments.map((segment) => {
    const others = segment.bouts.filter((bout) => bout.id !== change.boutId);
    if (segment.id !== change.segmentId) return { ...segment, bouts: others };
    const position = Math.min(Math.max(change.index, 0), others.length);
    return { ...segment, bouts: [...others.slice(0, position), { ...moving, segmentId: segment.id }, ...others.slice(position)] };
  });
}

/**
 * Adónde va una pelea que se suelta sobre otra pelea o sobre un bloque. `isBelow` dice si quedó por debajo del centro
 * de la pelea de destino (en otro bloque entonces se inserta después). `null` si no cambia nada.
 */
export function resolveDrop(segments: AdminSegment[], activeId: string, overId: string, isBelow: boolean): { segmentId: string; index: number } | null {
  const owner = segments.find((segment) => segment.bouts.some((bout) => bout.id === activeId));
  if (!owner) return null;

  if (overId.startsWith(SEGMENT_PREFIX)) {
    const target = segments.find((segment) => segment.id === overId.slice(SEGMENT_PREFIX.length));
    if (!target) return null;
    const alreadyLast = target.id === owner.id && target.bouts.at(-1)?.id === activeId;
    return alreadyLast ? null : { segmentId: target.id, index: target.bouts.filter((bout) => bout.id !== activeId).length };
  }

  if (overId === activeId) return null;
  const targetSegment = segments.find((segment) => segment.bouts.some((bout) => bout.id === overId));
  if (!targetSegment) return null;
  const overIndex = targetSegment.bouts.findIndex((bout) => bout.id === overId);
  return { segmentId: targetSegment.id, index: targetSegment.id === owner.id ? overIndex : overIndex + (isBelow ? 1 : 0) };
}
