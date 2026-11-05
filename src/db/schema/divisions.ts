import { boolean, index, integer, numeric, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./_columns";

export const fighterGender = pgEnum("fighter_gender", ["male", "female"]);

export const divisions = pgTable(
  "divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    gender: fighterGender("gender").notNull(),
    limitKg: numeric("limit_kg", { precision: 5, scale: 1, mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    rankingSlots: integer("ranking_slots").notNull().default(5),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    // listDivisions ordena por género y orden dentro del género.
    index("divisions_gender_sort_order_idx").on(table.gender, table.sortOrder),
    index("divisions_active_idx").on(table.active),
  ],
);

export type Division = typeof divisions.$inferSelect;
