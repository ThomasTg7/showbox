import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { postBodyMedia, postCategories, postEvents, postFighters, postGallery, posts, type Post } from "@/db/schema/posts";
import type { Executor } from "@/db/types";
import { bodyHasEmbed, collectBodyMediaIds } from "@/domain/post-body";
import { slugify, uniqueSlug } from "@/domain/slug";
import { logAudit } from "@/features/audit/log";
import { assertUsableMedia } from "@/features/media/service";
import { publicationInputSchema, type PublicationInput } from "@/features/publication/schema";
import { softDelete } from "@/features/trash/trash";
import { UserFacingError } from "@/lib/user-facing-error";
import { getPostRelationIds } from "./admin-queries";
import { postInputSchema, type PostData, type PostRawInput } from "./schema";

const NOT_FOUND = "No se encontró la noticia";

function parsePost(input: PostRawInput): PostData {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  return parsed.data;
}

/** Columnas editables (sin slug ni publicación, que se resuelven aparte). */
function editableColumns(data: PostData) {
  return {
    title: data.title,
    excerpt: data.excerpt,
    categoryId: data.categoryId,
    featured: data.featured,
    coverMediaId: data.coverMediaId,
    body: data.body,
    // La galería o un video/publicación en el cuerpo la meten en «No te lo pierdas»; una foto suelta en el texto no.
    hasMedia: data.galleryMediaIds.length > 0 || bodyHasEmbed(data.body),
  };
}

/**
 * La fecha de una noticia publicada es el momento en que se publicó: así «Publicar» la deja arriba del listado aunque el
 * borrador se haya creado hace semanas. Programada, es la fecha elegida; borrador, no tiene. Una noticia que ya estaba
 * publicada conserva su fecha al guardarla de nuevo.
 */
function publishAtFor(status: PostData["status"], requested: Date | null, current: Pick<Post, "status" | "publishAt"> | null): Date | null {
  if (status === "scheduled") return requested;
  if (status !== "published") return null;
  if (current?.status === "published") return current.publishAt;
  // Una programada cuya hora ya pasó ya está en el sitio con esa fecha: publicarla no la mueve.
  if (current?.status === "scheduled" && current.publishAt && current.publishAt <= new Date()) return current.publishAt;
  return new Date();
}

async function assertUsableImages(db: Db, data: PostData): Promise<void> {
  await assertUsableMedia(db, [
    { id: data.coverMediaId, kind: "news_cover" },
    ...data.galleryMediaIds.map((id) => ({ id, kind: "gallery" as const })),
    ...collectBodyMediaIds(data.body).map((id) => ({ id, kind: "gallery" as const })),
  ]);
}

type RelationIds = { fighterIds: string[]; eventIds: string[] };
const NO_RELATIONS: RelationIds = { fighterIds: [], eventIds: [] };

/**
 * Una relación nueva debe ser con un boxeador o evento fuera de la papelera. Las que la noticia ya tenía se conservan
 * aunque estén en la papelera (el sitio las oculta y el panel las marca): editar otra cosa no obliga a quitarlas.
 */
async function assertRelationsExist(db: Db, data: PostData, kept: RelationIds = NO_RELATIONS): Promise<void> {
  const newFighterIds = data.fighterIds.filter((id) => !kept.fighterIds.includes(id));
  const newEventIds = data.eventIds.filter((id) => !kept.eventIds.includes(id));
  if (newFighterIds.length > 0) {
    const found = await db.select({ id: fighters.id }).from(fighters).where(and(inArray(fighters.id, newFighterIds), isNull(fighters.deletedAt)));
    if (found.length !== newFighterIds.length) throw new UserFacingError("Uno de los boxeadores relacionados ya no existe. Quítalo y vuelve a guardar.");
  }
  if (newEventIds.length > 0) {
    const found = await db.select({ id: events.id }).from(events).where(and(inArray(events.id, newEventIds), isNull(events.deletedAt)));
    if (found.length !== newEventIds.length) throw new UserFacingError("Uno de los eventos relacionados ya no existe. Quítalo y vuelve a guardar.");
  }
}

async function assertCategoryExists(db: Db, categoryId: string): Promise<void> {
  const [row] = await db.select({ id: postCategories.id }).from(postCategories).where(eq(postCategories.id, categoryId)).limit(1);
  if (!row) throw new UserFacingError("La categoría ya no existe. Elige otra.");
}

async function slugTaken(db: Executor, slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(exceptId ? and(eq(posts.slug, slug), ne(posts.id, exceptId)) : eq(posts.slug, slug))
    .limit(1);
  return row !== undefined;
}

/** Reescribe todo lo que cuelga de la noticia (relaciones, galería y copia de las imágenes del cuerpo) dentro de la transacción. */
async function writeAttachments(tx: Executor, postId: string, data: PostData): Promise<void> {
  await tx.delete(postFighters).where(eq(postFighters.postId, postId));
  await tx.delete(postEvents).where(eq(postEvents.postId, postId));
  await tx.delete(postGallery).where(eq(postGallery.postId, postId));
  await tx.delete(postBodyMedia).where(eq(postBodyMedia.postId, postId));

  const bodyMediaIds = collectBodyMediaIds(data.body);
  if (data.fighterIds.length > 0) await tx.insert(postFighters).values(data.fighterIds.map((fighterId) => ({ postId, fighterId })));
  if (data.eventIds.length > 0) await tx.insert(postEvents).values(data.eventIds.map((eventId) => ({ postId, eventId })));
  if (data.galleryMediaIds.length > 0) await tx.insert(postGallery).values(data.galleryMediaIds.map((mediaId, sortOrder) => ({ postId, mediaId, sortOrder })));
  if (bodyMediaIds.length > 0) await tx.insert(postBodyMedia).values(bodyMediaIds.map((mediaId) => ({ postId, mediaId })));
}

async function findEditablePost(db: Executor, id: string): Promise<Post> {
  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
    .limit(1);
  if (!row) throw new UserFacingError(NOT_FOUND);
  return row;
}

async function validateForSave(db: Db, data: PostData, kept?: RelationIds): Promise<void> {
  await assertCategoryExists(db, data.categoryId);
  await assertUsableImages(db, data);
  await assertRelationsExist(db, data, kept);
}

export async function createPost(db: Db, input: PostRawInput, actorId: string): Promise<{ id: string; slug: string }> {
  const data = parsePost(input);
  await validateForSave(db, data);

  let slug: string;
  if (data.slug) {
    if (await slugTaken(db, data.slug)) throw new UserFacingError("Ese enlace ya lo usa otra noticia");
    slug = data.slug;
  } else {
    slug = await uniqueSlug(slugify(data.title) || "noticia", (candidate) => slugTaken(db, candidate));
  }

  const status = data.status ?? "draft";
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(posts)
      .values({ ...editableColumns(data), slug, status, publishAt: publishAtFor(status, data.publishAt, null) })
      .returning({ id: posts.id });
    if (!created) throw new UserFacingError("No se pudo guardar la noticia");

    await writeAttachments(tx, created.id, data);
    await logAudit(tx, { actorId, action: "create", entityType: "post", entityId: created.id, summary: `Creó la noticia ${data.title}` });
    return { id: created.id, slug };
  });
}

/**
 * Edita la noticia. El slug publicado no cambia al renombrarla: solo si `input.slug` trae uno distinto. La publicación solo
 * cambia si `input.status` viene informado. Las relaciones, la galería y las imágenes del cuerpo se reemplazan completas.
 */
export async function updatePost(db: Db, id: string, input: PostRawInput, actorId: string): Promise<{ slug: string }> {
  const data = parsePost(input);
  const current = await findEditablePost(db, id);
  await validateForSave(db, data, await getPostRelationIds(db, id));

  const slug = data.slug ?? current.slug;
  if (slug !== current.slug && (await slugTaken(db, slug, id))) throw new UserFacingError("Ese enlace ya lo usa otra noticia");

  await db.transaction(async (tx) => {
    await tx
      .update(posts)
      .set({
        ...editableColumns(data),
        slug,
        ...(data.status ? { status: data.status, publishAt: publishAtFor(data.status, data.publishAt, current) } : {}),
      })
      .where(eq(posts.id, id));
    await writeAttachments(tx, id, data);
    await logAudit(tx, { actorId, action: "update", entityType: "post", entityId: id, summary: `Editó la noticia ${data.title}` });
  });
  return { slug };
}

const PUBLICATION_LABEL = { draft: "Pasó a borrador la noticia", scheduled: "Programó la publicación de la noticia", published: "Publicó la noticia" } as const;

export async function setPostPublication(db: Db, id: string, input: PublicationInput, actorId: string): Promise<void> {
  const parsed = publicationInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { status, publishAt } = parsed.data;

  await db.transaction(async (tx) => {
    const current = await findEditablePost(tx, id);
    await tx.update(posts).set({ status, publishAt: publishAtFor(status, publishAt, current) }).where(eq(posts.id, id));
    await logAudit(tx, { actorId, action: "publish", entityType: "post", entityId: id, summary: `${PUBLICATION_LABEL[status]} ${current.title}` });
  });
}

/** Envía la noticia a la papelera (se recupera desde Papelera; se elimina sola a los 30 días). */
export async function deletePost(db: Db, id: string, actorId: string): Promise<void> {
  try {
    await softDelete(db, "post", id, actorId);
  } catch (error) {
    // Solo «no existe o ya estaba en la papelera» se explica así; un fallo de la base sigue su curso (y queda en el log).
    throw error instanceof UserFacingError ? new UserFacingError(NOT_FOUND) : error;
  }
}
