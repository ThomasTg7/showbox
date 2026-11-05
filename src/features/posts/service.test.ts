import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { fighters } from "@/db/schema/fighters";
import { postBodyMedia, postCategories, postEvents, postFighters, postGallery, posts } from "@/db/schema/posts";
import type { PostBody } from "@/domain/post-body";
import { fighterIdBySlug, insertEvent } from "@/features/events/test-helpers";
import { seedFighters } from "@/features/fighters/seed";
import { insertMedia } from "@/features/fighters/test-helpers";
import { createTestDb } from "@/test/db";
import { deleteCategory, reorderCategories, saveCategory } from "./categories-service";
import { createPost, deletePost, setPostPublication, updatePost } from "./service";
import { categoryIdBySlug, insertPost, validPostInput } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;
let anuncios: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedFighters(db);
  anuncios = await categoryIdBySlug(db, "anuncios");
});
afterAll(() => close());

const MISSING = "00000000-0000-4000-8000-000000000000";
const auditRows = (entityId: string) => db.select().from(auditLog).where(eq(auditLog.entityId, entityId));
const findPost = async (id: string) => (await db.select().from(posts).where(eq(posts.id, id)))[0]!;
const bodyMediaOf = async (id: string) => (await db.select().from(postBodyMedia).where(eq(postBodyMedia.postId, id))).map((row) => row.mediaId).sort();

const paragraph = (value: string) => ({ type: "paragraph", content: [{ type: "text", text: value }] });
const image = (mediaId: string) => ({ type: "image", attrs: { mediaId } });
const doc = (...content: unknown[]) => ({ type: "doc", content }) as unknown as PostBody;

describe("createPost", () => {
  it("creates a draft with a slug from the title, the category and an audit row", async () => {
    const { id, slug } = await createPost(db, validPostInput(anuncios), "admin-1");
    expect(slug).toBe("cevallos-defiende-el-cinturon");

    expect(await findPost(id)).toMatchObject({ status: "draft", publishAt: null, categoryId: anuncios, featured: false, coverMediaId: null });
    const audit = await auditRows(id);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: "create", entityType: "post" });
  });

  it("adds a numeric suffix when the slug is taken", async () => {
    expect((await createPost(db, validPostInput(anuncios), "admin-1")).slug).toBe("cevallos-defiende-el-cinturon-2");
  });

  it("requires a title and a category that exists", async () => {
    await expect(createPost(db, validPostInput(anuncios, { title: "  " }), "admin-1")).rejects.toThrow("El título es obligatorio");
    await expect(createPost(db, { title: "Sin categoría" } as never, "admin-1")).rejects.toThrow("Elige una categoría");
    await expect(createPost(db, validPostInput(MISSING), "admin-1")).rejects.toThrow("La categoría ya no existe");
  });

  it.each([
    ["a code block", doc({ type: "codeBlock", content: [{ type: "text", text: "x" }] })],
    ["raw html", doc({ type: "html", attrs: { html: "<script>alert(1)</script>" } })],
    ["a javascript link", doc({ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] })],
  ])("rejects a body with %s", async (_name, body) => {
    await expect(createPost(db, validPostInput(anuncios, { title: "Con contenido raro", body }), "admin-1")).rejects.toThrow("Contenido no permitido");
  });

  it("accepts the body as JSON text, as a form sends it, and refuses text that is not JSON", async () => {
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Cuerpo en texto", body: JSON.stringify(doc(paragraph("Hola"))) }), "admin-1");
    expect((await findPost(id)).body).toEqual(doc(paragraph("Hola")));
    await expect(createPost(db, validPostInput(anuncios, { title: "Cuerpo roto", body: "{no es json" }), "admin-1")).rejects.toThrow("Contenido no permitido");
  });

  it("stores the featured flag and the excerpt, accepting the form's checkbox value", async () => {
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Destacada", featured: "on", excerpt: "  Bajada  " }), "admin-1");
    expect(await findPost(id)).toMatchObject({ featured: true, excerpt: "Bajada" });
  });

  it("requires a date to schedule, and a published post carries the moment it was published", async () => {
    await expect(createPost(db, validPostInput(anuncios, { title: "Programar", status: "scheduled" }), "admin-1")).rejects.toThrow("Elige fecha y hora");
    const before = Date.now();
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Publicada ya", status: "published" }), "admin-1");
    const row = await findPost(id);
    expect(row.status).toBe("published");
    expect(row.publishAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("stores the cover, the gallery in order and the body images, and refuses an image of another kind or a missing one", async () => {
    const cover = await insertMedia(db, "news_cover");
    const [first, second, inBody] = [await insertMedia(db, "gallery"), await insertMedia(db, "gallery"), await insertMedia(db, "gallery")];
    const { id } = await createPost(
      db,
      validPostInput(anuncios, { title: "Con imágenes", coverMediaId: cover, galleryMediaIds: [second!, first!], body: doc(paragraph("a"), image(inBody!)) }),
      "admin-1",
    );
    expect(await findPost(id)).toMatchObject({ coverMediaId: cover });
    expect((await db.select().from(postGallery).where(eq(postGallery.postId, id)).orderBy(asc(postGallery.sortOrder))).map((row) => row.mediaId)).toEqual([second, first]);
    expect(await bodyMediaOf(id)).toEqual([inBody]);

    await expect(createPost(db, validPostInput(anuncios, { title: "Portada mala", coverMediaId: first }), "admin-1")).rejects.toThrow("La imagen ya no está disponible");
    await expect(createPost(db, validPostInput(anuncios, { title: "Galería mala", galleryMediaIds: [cover] }), "admin-1")).rejects.toThrow("La imagen ya no está disponible");
    await expect(createPost(db, validPostInput(anuncios, { title: "Cuerpo malo", body: doc(image(MISSING)) }), "admin-1")).rejects.toThrow("La imagen ya no está disponible");
  });

  it("relates fighters and events and refuses ones that do not exist", async () => {
    const cevallos = await fighterIdBySlug(db, "bryan-cevallos");
    const event = await insertEvent(db);
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Con relaciones", fighterIds: [cevallos, cevallos], eventIds: [event.id] }), "admin-1");
    expect((await db.select().from(postFighters).where(eq(postFighters.postId, id))).map((row) => row.fighterId)).toEqual([cevallos]);
    expect((await db.select().from(postEvents).where(eq(postEvents.postId, id))).map((row) => row.eventId)).toEqual([event.id]);

    await expect(createPost(db, validPostInput(anuncios, { title: "Boxeador fantasma", fighterIds: [MISSING] }), "admin-1")).rejects.toThrow("boxeador");
    await expect(createPost(db, validPostInput(anuncios, { title: "Evento fantasma", eventIds: [MISSING] }), "admin-1")).rejects.toThrow("evento");
  });
});

describe("updatePost", () => {
  it("edits the data, keeps the slug and audits", async () => {
    const { id, slug } = await createPost(db, validPostInput(anuncios, { title: "Para editar" }), "admin-1");
    const result = await updatePost(db, id, validPostInput(anuncios, { title: "Título nuevo", excerpt: "Nueva bajada" }), "admin-1");
    expect(result.slug).toBe(slug);
    expect(await findPost(id)).toMatchObject({ title: "Título nuevo", excerpt: "Nueva bajada" });
    expect((await auditRows(id)).map((entry) => entry.action).sort()).toEqual(["create", "update"]);
  });

  it("changes the slug only when a different one is written, and refuses a taken one", async () => {
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Enlace" }), "admin-1");
    expect((await updatePost(db, id, validPostInput(anuncios, { title: "Enlace", slug: "enlace-nuevo" }), "admin-1")).slug).toBe("enlace-nuevo");
    await expect(updatePost(db, id, validPostInput(anuncios, { title: "Enlace", slug: "cevallos-defiende-el-cinturon" }), "admin-1")).rejects.toThrow("Ese enlace ya lo usa otra noticia");
  });

  it("replaces the related fighters and events completely", async () => {
    const [cevallos, quinonez, andrango] = [await fighterIdBySlug(db, "bryan-cevallos"), await fighterIdBySlug(db, "jordan-quinonez"), await fighterIdBySlug(db, "kevin-andrango")];
    const [eventA, eventB] = [await insertEvent(db), await insertEvent(db)];
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Relaciones", fighterIds: [cevallos, quinonez], eventIds: [eventA.id] }), "admin-1");

    await updatePost(db, id, validPostInput(anuncios, { title: "Relaciones", fighterIds: [andrango], eventIds: [eventB.id] }), "admin-1");
    expect((await db.select().from(postFighters).where(eq(postFighters.postId, id))).map((row) => row.fighterId)).toEqual([andrango]);
    expect((await db.select().from(postEvents).where(eq(postEvents.postId, id))).map((row) => row.eventId)).toEqual([eventB.id]);

    await updatePost(db, id, validPostInput(anuncios, { title: "Relaciones" }), "admin-1");
    expect(await db.select().from(postFighters).where(eq(postFighters.postId, id))).toEqual([]);
    expect(await db.select().from(postEvents).where(eq(postEvents.postId, id))).toEqual([]);
  });

  it("takes an image that disappears from the body out of the in-use copy, and rewrites the gallery", async () => {
    const [a, b, g1, g2] = [await insertMedia(db, "gallery"), await insertMedia(db, "gallery"), await insertMedia(db, "gallery"), await insertMedia(db, "gallery")];
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Imágenes cambiantes", body: doc(image(a!), image(b!)), galleryMediaIds: [g1!, g2!] }), "admin-1");
    expect(await bodyMediaOf(id)).toEqual([a, b].sort());

    await updatePost(db, id, validPostInput(anuncios, { title: "Imágenes cambiantes", body: doc(image(b!)), galleryMediaIds: [g2!] }), "admin-1");
    expect(await bodyMediaOf(id)).toEqual([b]);
    expect((await db.select().from(postGallery).where(eq(postGallery.postId, id))).map((row) => row.mediaId)).toEqual([g2]);
  });

  it("does not touch the publication unless a status comes with the data, and keeps the date of an already published post", async () => {
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Publicada", status: "published" }), "admin-1");
    const publishedAt = (await findPost(id)).publishAt;

    await updatePost(db, id, validPostInput(anuncios, { title: "Publicada" }), "admin-1");
    expect(await findPost(id)).toMatchObject({ status: "published", publishAt: publishedAt });
    await updatePost(db, id, validPostInput(anuncios, { title: "Publicada", status: "published" }), "admin-1");
    expect((await findPost(id)).publishAt).toEqual(publishedAt);
    await updatePost(db, id, validPostInput(anuncios, { title: "Publicada", status: "draft" }), "admin-1");
    expect(await findPost(id)).toMatchObject({ status: "draft", publishAt: null });
  });

  it("rejects a post that does not exist or is in the trash, and a body that is not allowed", async () => {
    await expect(updatePost(db, MISSING, validPostInput(anuncios), "admin-1")).rejects.toThrow("No se encontró la noticia");
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Se edita mal" }), "admin-1");
    await expect(updatePost(db, id, validPostInput(anuncios, { title: "Se edita mal", body: doc({ type: "codeBlock" }) }), "admin-1")).rejects.toThrow("Contenido no permitido");
  });
});

describe("updatePost with a related fighter in the trash", () => {
  it("keeps saving a post whose fighter went to the trash, but refuses to add a trashed fighter", async () => {
    const andrango = await fighterIdBySlug(db, "kevin-andrango");
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Con Andrango", fighterIds: [andrango] }), "admin-1");
    await db.update(fighters).set({ deletedAt: new Date() }).where(eq(fighters.id, andrango));
    try {
      // El formulario reenvía la relación (marcada «no se ve en el sitio»): editar otra cosa no debe fallar.
      await updatePost(db, id, validPostInput(anuncios, { title: "Con Andrango, corregida", fighterIds: [andrango] }), "admin-1");
      expect((await findPost(id)).title).toBe("Con Andrango, corregida");
      expect((await db.select().from(postFighters).where(eq(postFighters.postId, id))).map((row) => row.fighterId)).toEqual([andrango]);

      const other = await createPost(db, validPostInput(anuncios, { title: "Sin Andrango" }), "admin-1");
      await expect(updatePost(db, other.id, validPostInput(anuncios, { title: "Sin Andrango", fighterIds: [andrango] }), "admin-1")).rejects.toThrow("boxeador");
    } finally {
      await db.update(fighters).set({ deletedAt: null }).where(eq(fighters.id, andrango));
    }
  });
});

describe("setPostPublication and deletePost", () => {
  it("keeps the date of a scheduled post that is already public when it is published", async () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Programada que ya salió", status: "scheduled", publishAt: yesterday }), "admin-1");
    await setPostPublication(db, id, { status: "published", publishAt: null }, "admin-1");
    expect((await findPost(id)).publishAt).toEqual(yesterday);

    const tomorrow = new Date(Date.now() + 86_400_000);
    const future = await createPost(db, validPostInput(anuncios, { title: "Programada para mañana", status: "scheduled", publishAt: tomorrow }), "admin-1");
    await setPostPublication(db, future.id, { status: "published", publishAt: null }, "admin-1");
    expect((await findPost(future.id)).publishAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("publishes, schedules, returns to draft and audits", async () => {
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Publicar luego" }), "admin-1");
    await setPostPublication(db, id, { status: "published", publishAt: null }, "admin-1");
    expect((await findPost(id)).status).toBe("published");

    const when = new Date(Date.now() + 86_400_000);
    await setPostPublication(db, id, { status: "scheduled", publishAt: when }, "admin-1");
    expect(await findPost(id)).toMatchObject({ status: "scheduled", publishAt: when });
    await expect(setPostPublication(db, id, { status: "scheduled", publishAt: null }, "admin-1")).rejects.toThrow("Elige fecha y hora");

    await setPostPublication(db, id, { status: "draft", publishAt: null }, "admin-1");
    expect(await findPost(id)).toMatchObject({ status: "draft", publishAt: null });
    expect((await auditRows(id)).filter((entry) => entry.action === "publish")).toHaveLength(3);
    await expect(setPostPublication(db, MISSING, { status: "published", publishAt: null }, "admin-1")).rejects.toThrow("No se encontró la noticia");
  });

  it("sends a post to the trash once and says so the second time", async () => {
    const { id } = await createPost(db, validPostInput(anuncios, { title: "A la papelera" }), "admin-1");
    await deletePost(db, id, "admin-1");
    expect((await findPost(id)).deletedAt).not.toBeNull();
    await expect(deletePost(db, id, "admin-1")).rejects.toThrow("No se encontró la noticia");
    await expect(updatePost(db, id, validPostInput(anuncios), "admin-1")).rejects.toThrow("No se encontró la noticia");
  });
});

describe("categories", () => {
  it("creates one at the end, renames it and refuses a repeated name without regard to case", async () => {
    const { id } = await saveCategory(db, { name: "Entrenamientos" }, "admin-1");
    const created = (await db.select().from(postCategories).where(eq(postCategories.id, id)))[0]!;
    expect(created).toMatchObject({ name: "Entrenamientos", slug: "entrenamientos", sortOrder: 4 });

    await saveCategory(db, { id, name: "Campamentos" }, "admin-1");
    expect((await db.select().from(postCategories).where(eq(postCategories.id, id)))[0]).toMatchObject({ name: "Campamentos", slug: "entrenamientos" });
    await expect(saveCategory(db, { name: "anuncios" }, "admin-1")).rejects.toThrow("Ya existe una categoría con ese nombre");
    await expect(saveCategory(db, { id, name: "  " }, "admin-1")).rejects.toThrow("Escribe el nombre de la categoría");
    await expect(saveCategory(db, { id: MISSING, name: "Nada" }, "admin-1")).rejects.toThrow("No se encontró la categoría");
    expect((await auditRows(id)).map((entry) => entry.action).sort()).toEqual(["create", "update"]);
  });

  it("refuses to delete a category that has posts (even in the trash) and deletes an empty one", async () => {
    const { id } = await saveCategory(db, { name: "Para borrar" }, "admin-1");
    const used = await insertPost(db, { categoryId: id, deletedAt: new Date() });
    await expect(deleteCategory(db, id, "admin-1")).rejects.toThrow("Tiene 1 noticia en la papelera");

    await db.delete(posts).where(eq(posts.id, used.id));
    await deleteCategory(db, id, "admin-1");
    expect(await db.select().from(postCategories).where(eq(postCategories.id, id))).toEqual([]);
    await expect(deleteCategory(db, id, "admin-1")).rejects.toThrow("No se encontró la categoría");
  });

  it("reorders the categories and refuses a list that is not exactly the catalog", async () => {
    const rows = await db.select().from(postCategories).orderBy(asc(postCategories.sortOrder));
    const reversed = rows.map((row) => row.id).reverse();
    await reorderCategories(db, reversed, "admin-1");
    expect((await db.select().from(postCategories).orderBy(asc(postCategories.sortOrder))).map((row) => row.id)).toEqual(reversed);
    await expect(reorderCategories(db, reversed.slice(1), "admin-1")).rejects.toThrow("La lista de categorías cambió");
  });
});

describe("fighter deletion keeps the post intact", () => {
  it("drops only the relation when the fighter row is purged", async () => {
    const [cevallos, quinonez] = [await fighterIdBySlug(db, "bryan-cevallos"), await fighterIdBySlug(db, "luis-mina")];
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Sobrevive", fighterIds: [cevallos, quinonez] }), "admin-1");
    await db.delete(fighters).where(eq(fighters.id, quinonez));
    expect((await db.select().from(postFighters).where(eq(postFighters.postId, id))).map((row) => row.fighterId)).toEqual([cevallos]);
    expect((await findPost(id)).title).toBe("Sobrevive");
  });
});

describe("posts.has_media (what feeds «No te lo pierdas»)", () => {
  const embed = { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ" } };

  it("is false for a text-only post, and true with a social post or video in the body", async () => {
    const plain = await createPost(db, validPostInput(anuncios, { title: "Solo texto", body: doc(paragraph("Hola")) }), "admin-1");
    const withEmbed = await createPost(db, validPostInput(anuncios, { title: "Con video", body: doc(paragraph("Mira"), embed) }), "admin-1");

    expect((await findPost(plain.id)).hasMedia).toBe(false);
    expect((await findPost(withEmbed.id)).hasMedia).toBe(true);
  });

  it("is true when the post has a gallery, and false with only a photo inside the text", async () => {
    const galleryPhoto = await insertMedia(db, "gallery");
    const bodyPhoto = await insertMedia(db, "gallery");
    const withGallery = await createPost(db, validPostInput(anuncios, { title: "Con galería", galleryMediaIds: [galleryPhoto] }), "admin-1");
    const withBodyPhoto = await createPost(db, validPostInput(anuncios, { title: "Foto en el texto", body: doc(image(bodyPhoto)) }), "admin-1");

    expect((await findPost(withGallery.id)).hasMedia).toBe(true);
    expect((await findPost(withBodyPhoto.id)).hasMedia).toBe(false);
  });

  it("follows the post when it is edited: adding a video turns it on, removing it turns it off", async () => {
    const { id } = await createPost(db, validPostInput(anuncios, { title: "Cambia de contenido", body: doc(paragraph("Antes")) }), "admin-1");
    expect((await findPost(id)).hasMedia).toBe(false);

    await updatePost(db, id, validPostInput(anuncios, { title: "Cambia de contenido", body: doc(paragraph("Después"), embed) }), "admin-1");
    expect((await findPost(id)).hasMedia).toBe(true);

    await updatePost(db, id, validPostInput(anuncios, { title: "Cambia de contenido", body: doc(paragraph("Sin video")) }), "admin-1");
    expect((await findPost(id)).hasMedia).toBe(false);
  });
});
