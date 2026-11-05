import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { EMPTY_POST_BODY, type PostBody } from "@/domain/post-body";
import { publication, timestamps } from "./_columns";
import { events } from "./events";
import { fighters } from "./fighters";
import { media } from "./media";

/** Categoría de noticias (catálogo editable: Anuncios, Resultados, Entrevistas, Detrás de cámaras). */
export const postCategories = pgTable("post_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    coverMediaId: uuid("cover_media_id").references(() => media.id, { onDelete: "restrict" }),
    /** Texto enriquecido (JSON de Tiptap restringido a los nodos de `domain/post-body.ts`). */
    body: jsonb("body").$type<PostBody>().notNull().default(EMPTY_POST_BODY),
    // `restrict`: una categoría con noticias no se borra (`deleteCategory` lo explica antes).
    categoryId: uuid("category_id")
      .notNull()
      .references(() => postCategories.id, { onDelete: "restrict" }),
    featured: boolean("featured").notNull().default(false),
    /** Calculado al guardar: tiene galería o una publicación/video en el cuerpo. Alimenta «No te lo pierdas» sin leer el JSON del cuerpo. */
    hasMedia: boolean("has_media").notNull().default(false),
    ...publication,
    ...timestamps,
  },
  (table) => [
    // slug ya tiene índice único; el resto sirve a listados, home, papelera y filtros.
    index("posts_category_id_idx").on(table.categoryId),
    index("posts_featured_idx").on(table.featured),
    index("posts_has_media_idx").on(table.hasMedia),
    index("posts_status_idx").on(table.status),
    index("posts_publish_at_idx").on(table.publishAt),
    index("posts_deleted_at_idx").on(table.deletedAt),
    index("posts_cover_media_id_idx").on(table.coverMediaId),
    // Orden de todos los listados (`newestFirst` en `card-rows.ts`): más reciente primero, el id desempata.
    // Mismo orden que la consulta (`DESC` a secas, nulos primero) para que Postgres recorra el índice sin ordenar.
    index("posts_date_idx").on(sql`coalesce(${table.publishAt}, ${table.createdAt}) desc`, sql`${table.id} desc`),
  ],
);

/** Boxeadores relacionados. Se borran con la noticia o con el boxeador (al purgarlo de la papelera). */
export const postFighters = pgTable(
  "post_fighters",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    fighterId: uuid("fighter_id")
      .notNull()
      .references(() => fighters.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.fighterId] }), index("post_fighters_fighter_id_idx").on(table.fighterId)],
);

export const postEvents = pgTable(
  "post_events",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.eventId] }), index("post_events_event_id_idx").on(table.eventId)],
);

/** Galería de la noticia, en el orden que se muestra. */
export const postGallery = pgTable(
  "post_gallery",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.postId, table.mediaId] }), index("post_gallery_media_id_idx").on(table.mediaId)],
);

/** Copia de las imágenes que aparecen dentro del cuerpo: así cuentan como «en uso» sin recorrer el JSON (spec §3, Plan 01). */
export const postBodyMedia = pgTable(
  "post_body_media",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.mediaId] }), index("post_body_media_media_id_idx").on(table.mediaId)],
);

export type Post = typeof posts.$inferSelect;
export type PostCategory = typeof postCategories.$inferSelect;
