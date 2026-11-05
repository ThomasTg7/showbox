import { index, integer, jsonb, numeric, pgEnum, pgTable, char, date, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { publication, timestamps } from "./_columns";
import { divisions, fighterGender } from "./divisions";
import { media } from "./media";

export const fighterStance = pgEnum("fighter_stance", ["orthodox", "southpaw", "switch"]);
export const careerStatus = pgEnum("career_status", ["active", "inactive", "retired"]);

export type FighterSocials = { instagram?: string; tiktok?: string; youtube?: string; x?: string };

export const fighters = pgTable(
  "fighters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    nickname: text("nickname"),
    gender: fighterGender("gender").notNull(),
    birthDate: date("birth_date", { mode: "string" }),
    nationality: char("nationality", { length: 2 }).notNull(),
    hometown: text("hometown"),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1, mode: "number" }),
    heightCm: integer("height_cm"),
    reachCm: integer("reach_cm"),
    stance: fighterStance("stance"),
    gym: text("gym"),
    coach: text("coach"),
    baseDiscipline: text("base_discipline"),
    bio: text("bio"),
    careerStatus: careerStatus("career_status").notNull().default("active"),
    socials: jsonb("socials").$type<FighterSocials>().notNull().default({}),
    bodyMediaId: uuid("body_media_id").references(() => media.id, { onDelete: "restrict" }),
    headshotMediaId: uuid("headshot_media_id").references(() => media.id, { onDelete: "restrict" }),
    proWins: integer("pro_wins").notNull().default(0),
    proLosses: integer("pro_losses").notNull().default(0),
    proDraws: integer("pro_draws").notNull().default(0),
    proNoContests: integer("pro_nc").notNull().default(0),
    amWins: integer("am_wins").notNull().default(0),
    amLosses: integer("am_losses").notNull().default(0),
    amDraws: integer("am_draws").notNull().default(0),
    amNoContests: integer("am_nc").notNull().default(0),
    /** Nombre, apellido y apodo en minúsculas y sin tildes: la búsqueda pública y del panel filtra aquí. */
    searchText: text("search_text").notNull().default(""),
    ...publication,
    ...timestamps,
  },
  (table) => [
    // slug ya tiene índice único; el resto sirve a listados, filtros y papelera.
    index("fighters_status_idx").on(table.status),
    index("fighters_publish_at_idx").on(table.publishAt),
    index("fighters_deleted_at_idx").on(table.deletedAt),
    index("fighters_division_id_idx").on(table.divisionId),
    index("fighters_body_media_id_idx").on(table.bodyMediaId),
    index("fighters_headshot_media_id_idx").on(table.headshotMediaId),
    index("fighters_nationality_idx").on(table.nationality),
    index("fighters_career_status_idx").on(table.careerStatus),
  ],
);

/** Galería de fotos del boxeador (spec §3), en el orden que se muestra. Se borra con el boxeador; la imagen, en cambio, no se puede quitar mientras se use. */
export const fighterGallery = pgTable(
  "fighter_gallery",
  {
    fighterId: uuid("fighter_id")
      .notNull()
      .references(() => fighters.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.fighterId, table.mediaId] }), index("fighter_gallery_media_id_idx").on(table.mediaId)],
);

export type Fighter = typeof fighters.$inferSelect;
