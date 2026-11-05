import { boolean, date, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { divisions } from "./divisions";
import { boutLevel, events } from "./events";
import { fighters } from "./fighters";

/**
 * Una versión inmutable de un ranking (alcance = nivel + división; `division_id` nulo = libra por libra). La pública es
 * la última de cada alcance; la anterior sirve para calcular el movimiento ▲▼.
 */
export const rankingVersions = pgTable(
  "ranking_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: boutLevel("level").notNull(),
    divisionId: uuid("division_id").references(() => divisions.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [index("ranking_versions_scope_idx").on(table.level, table.divisionId, table.createdAt)],
);

/**
 * Puestos de una versión. `cascade` en el boxeador: quien se purga de la papelera sale también de las versiones viejas
 * (de la vigente no puede: `deleteFighter` rechaza a un rankeado).
 */
export const rankingEntries = pgTable(
  "ranking_entries",
  {
    versionId: uuid("version_id")
      .notNull()
      .references(() => rankingVersions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    fighterId: uuid("fighter_id")
      .notNull()
      .references(() => fighters.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.versionId, table.position] }),
    unique("ranking_entries_version_fighter_unique").on(table.versionId, table.fighterId),
    index("ranking_entries_fighter_id_idx").on(table.fighterId),
  ],
);

/** Campeón actual de una división y nivel (puede estar vacante). Sin linaje ni interinos. */
export const titles = pgTable(
  "titles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: boutLevel("level").notNull(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id),
    championFighterId: uuid("champion_fighter_id").references(() => fighters.id, { onDelete: "restrict" }),
    since: date("since", { mode: "string" }),
  },
  (table) => [unique("titles_level_division_unique").on(table.level, table.divisionId), index("titles_champion_fighter_id_idx").on(table.championFighterId)],
);

/** Sugerencias de ranking que el admin descartó para un evento (`scope_key`: `pro:<división>` / `amateur:p4p`). */
export const dismissedSuggestions = pgTable(
  "dismissed_suggestions",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    fighterId: uuid("fighter_id")
      .notNull()
      .references(() => fighters.id, { onDelete: "cascade" }),
    scopeKey: text("scope_key").notNull(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.fighterId, table.scopeKey] }), index("dismissed_suggestions_fighter_id_idx").on(table.fighterId)],
);

/**
 * Si el sitio muestra los puestos de un nivel. Sin fila, están ocultos: una instalación nueva arma
 * sus puestos en el panel sin que el público los vea hasta que la promotora toca «Mostrar puestos» (los campeones se ven siempre).
 */
export const rankingLevels = pgTable("ranking_levels", {
  level: boutLevel("level").primaryKey(),
  isPublic: boolean("is_public").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RankingVersion = typeof rankingVersions.$inferSelect;
export type Title = typeof titles.$inferSelect;
