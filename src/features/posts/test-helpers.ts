import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { postCategories, postEvents, postFighters, posts } from "@/db/schema/posts";
import { seedPostCategories } from "./seed";
import { bodyHasEmbed } from "@/domain/post-body";
import type { PostFormInput } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export async function categoryIdBySlug(db: Db, slug: string): Promise<string> {
  await seedPostCategories(db);
  const [row] = await db.select({ id: postCategories.id }).from(postCategories).where(eq(postCategories.slug, slug));
  if (!row) throw new Error(`No existe la categoría ${slug}`);
  return row.id;
}

let postCounter = 0;

/** Noticia publicada (categoría Anuncios, creada hace 1 día) con datos mínimos; `overrides` pisa cualquier columna. */
export async function insertPost(
  db: Db,
  overrides: Partial<typeof posts.$inferInsert> & { fighterIds?: string[]; eventIds?: string[] } = {},
): Promise<{ id: string; slug: string }> {
  postCounter += 1;
  const { fighterIds = [], eventIds = [], ...columns } = overrides;
  const [row] = await db
    .insert(posts)
    .values({
      slug: `noticia-de-prueba-${postCounter}`,
      title: `Noticia de prueba ${postCounter}`,
      categoryId: columns.categoryId ?? (await categoryIdBySlug(db, "anuncios")),
      status: "published",
      createdAt: daysAgo(1),
      // Como el servicio: un video o una publicación en el cuerpo la meten en «No te lo pierdas».
      hasMedia: bodyHasEmbed(columns.body),
      ...columns,
    })
    .returning({ id: posts.id, slug: posts.slug });
  if (fighterIds.length) await db.insert(postFighters).values(fighterIds.map((fighterId) => ({ postId: row!.id, fighterId })));
  if (eventIds.length) await db.insert(postEvents).values(eventIds.map((eventId) => ({ postId: row!.id, eventId })));
  return row!;
}

/** Noticia válida mínima para los tests del servicio; `overrides` pisa cualquier campo. */
export function validPostInput(categoryId: string, overrides: Partial<PostFormInput> = {}): PostFormInput {
  return { title: "Cevallos defiende el cinturón", categoryId, ...overrides };
}
