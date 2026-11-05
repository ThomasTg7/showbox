import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { revalidateFighter } from "@/features/fighters/cache";
import { getEventFighterIds } from "./admin-queries";
import { revalidateEvent } from "./cache";

/**
 * Corre un cambio en la cartelera de un evento y expira lo público que lo muestra: la página del evento, los
 * listados y la ficha de cada boxeador de la cartelera (historial, récord, próxima pelea). Se leen los boxeadores
 * antes y después: quien acaba de salir de la cartelera también debe actualizarse. Solo desde server actions.
 */
export async function withEventRevalidation<T>(eventId: string, task: () => Promise<T>): Promise<T> {
  const before = await getEventFighterIds(db, eventId);
  const result = await task();
  const after = await getEventFighterIds(db, eventId);
  for (const fighterId of new Set([...before, ...after])) revalidateFighter(fighterId);
  revalidateEvent(eventId);
  return result;
}

/** Refresca las pantallas del panel que muestran la cartelera: el listado, el armador y la noche de pelea. */
export function revalidateEventPanel(): void {
  revalidatePath("/admin/eventos");
  revalidatePath("/admin/eventos/[id]/cartelera", "page");
  revalidatePath("/admin/eventos/[id]/en-vivo", "page");
}
