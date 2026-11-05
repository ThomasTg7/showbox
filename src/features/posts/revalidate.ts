import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { revalidateEvent } from "@/features/events/cache";
import { revalidateFighter } from "@/features/fighters/cache";
import { getPostRelationIds } from "./admin-queries";
import { revalidatePost } from "./cache";

type RelationIds = { fighterIds: string[]; eventIds: string[] };

/** Expira la noticia y las fichas y eventos donde aparece su carrusel. Solo desde server actions. */
function expire(postId: string, related: RelationIds[]): void {
  for (const fighterId of new Set(related.flatMap((ids) => ids.fighterIds))) revalidateFighter(fighterId);
  for (const eventId of new Set(related.flatMap((ids) => ids.eventIds))) revalidateEvent(eventId);
  revalidatePost(postId);
}

/**
 * Corre un cambio en una noticia y expira lo público que la muestra: la noticia, los listados y la ficha o el evento de
 * cada relacionado. Las relaciones se leen antes y después: una que se acaba de quitar también debe desaparecer.
 */
export async function withPostRevalidation<T>(postId: string, task: () => Promise<T>): Promise<T> {
  const before = await getPostRelationIds(db, postId);
  const result = await task();
  expire(postId, [before, await getPostRelationIds(db, postId)]);
  return result;
}

/** Una noticia recién creada no tenía relaciones antes: basta expirar las de ahora. */
export async function revalidateCreatedPost(postId: string): Promise<void> {
  expire(postId, [await getPostRelationIds(db, postId)]);
}

/** Refresca las pantallas del panel que muestran noticias. */
export function revalidatePostsPanel(): void {
  revalidatePath("/admin/noticias");
}
