import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { postCategories, posts } from "@/db/schema/posts";
import type { Executor } from "@/db/types";
import { slugify, uniqueSlug } from "@/domain/slug";
import { logAudit } from "@/features/audit/log";
import { sortOrderCase } from "@/features/events/ordering";
import { UserFacingError } from "@/lib/user-facing-error";
import { categoryInputSchema, type CategoryInput } from "./schema";

// Catálogo editable de categorías de noticias (spec §4.8): agregar, renombrar, ordenar y quitar las vacías.

const NOT_FOUND = "No se encontró la categoría";

async function orderedIds(db: Executor): Promise<string[]> {
  const rows = await db.select({ id: postCategories.id }).from(postCategories).orderBy(asc(postCategories.sortOrder), asc(postCategories.name));
  return rows.map((row) => row.id);
}

async function writeOrder(db: Executor, ids: string[]): Promise<void> {
  if (ids.length > 0) await db.update(postCategories).set({ sortOrder: sortOrderCase(postCategories.id, ids) }).where(inArray(postCategories.id, ids));
}

/** Crea una categoría al final o, con `id`, la renombra (el enlace del filtro no cambia). El nombre no se repite (sin distinguir mayúsculas). */
export async function saveCategory(db: Db, input: CategoryInput, actorId: string): Promise<{ id: string }> {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { id, name } = parsed.data;

  const sameName = sql`lower(${postCategories.name}) = lower(${name})`;
  const [taken] = await db
    .select({ id: postCategories.id })
    .from(postCategories)
    .where(id ? and(sameName, ne(postCategories.id, id)) : sameName)
    .limit(1);
  if (taken) throw new UserFacingError("Ya existe una categoría con ese nombre");

  if (id) {
    const [updated] = await db.update(postCategories).set({ name }).where(eq(postCategories.id, id)).returning({ id: postCategories.id });
    if (!updated) throw new UserFacingError(NOT_FOUND);
    await logAudit(db, { actorId, action: "update", entityType: "post_category", entityId: id, summary: `Renombró la categoría de noticias «${name}»` });
    return { id };
  }

  const slug = await uniqueSlug(slugify(name) || "categoria", async (candidate) => {
    const [row] = await db.select({ id: postCategories.id }).from(postCategories).where(eq(postCategories.slug, candidate)).limit(1);
    return row !== undefined;
  });
  const [{ total }] = await db.select({ total: count() }).from(postCategories);
  const [created] = await db.insert(postCategories).values({ name, slug, sortOrder: total ?? 0 }).returning({ id: postCategories.id });
  if (!created) throw new UserFacingError("No se pudo guardar la categoría");
  await logAudit(db, { actorId, action: "create", entityType: "post_category", entityId: created.id, summary: `Agregó la categoría de noticias «${name}»` });
  return { id: created.id };
}

/** `ids` debe ser exactamente el catálogo, en el orden nuevo. */
export async function reorderCategories(db: Db, ids: string[], actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await orderedIds(tx);
    if (ids.length !== current.length || new Set(ids).size !== ids.length || ids.some((id) => !current.includes(id))) {
      throw new UserFacingError("La lista de categorías cambió: recarga la página e inténtalo de nuevo");
    }
    await writeOrder(tx, ids);
    await logAudit(tx, { actorId, action: "update", entityType: "post_category", entityId: "order", summary: "Reordenó las categorías de noticias" });
  });
}

/** Solo se elimina una categoría que ninguna noticia usa (tampoco las de la papelera: la base no lo permite). */
export async function deleteCategory(db: Db, id: string, actorId: string): Promise<void> {
  const [category] = await db.select({ name: postCategories.name }).from(postCategories).where(eq(postCategories.id, id)).limit(1);
  if (!category) throw new UserFacingError(NOT_FOUND);

  const [{ total, inTrash }] = await db
    .select({ total: count(), inTrash: count(posts.deletedAt) })
    .from(posts)
    .where(eq(posts.categoryId, id));
  if ((total ?? 0) > 0) {
    // Las de la papelera no salen en el listado: se dicen aparte para que se sepa dónde buscarlas.
    const noun = (n: number) => `${n} ${n === 1 ? "noticia" : "noticias"}`;
    const visible = total - inTrash;
    const where = visible === 0 ? `${noun(inTrash)} en la papelera` : inTrash > 0 ? `${noun(visible)} (y ${inTrash} en la papelera)` : noun(visible);
    throw new UserFacingError(`Tiene ${where}: cámbialas de categoría antes de eliminarla`);
  }

  await db.transaction(async (tx) => {
    await tx.delete(postCategories).where(eq(postCategories.id, id));
    await writeOrder(tx, await orderedIds(tx));
    await logAudit(tx, { actorId, action: "delete", entityType: "post_category", entityId: id, summary: `Eliminó la categoría de noticias «${category.name}»` });
  });
}
