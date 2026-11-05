import { boolean, date, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { SPONSOR_TIERS } from "@/domain/sponsors";
import { timestamps } from "./_columns";
import { events } from "./events";
import { media } from "./media";

export const sponsorTier = pgEnum("sponsor_tier", SPONSOR_TIERS);

/**
 * Patrocinadores. Se muestran dentro de su vigencia (`starts_on`/`ends_on`: días de Ecuador, un extremo nulo está abierto)
 * y según su alcance: todos los eventos (`all_events`) o solo los de `sponsor_events`. El logo es obligatorio.
 */
export const sponsors = pgTable(
  "sponsors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    logoMediaId: uuid("logo_media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    url: text("url"),
    tier: sponsorTier("tier").notNull(),
    /** Orden dentro del nivel: contiguo (0..n-1). */
    sortOrder: integer("sort_order").notNull().default(0),
    startsOn: date("starts_on", { mode: "string" }),
    endsOn: date("ends_on", { mode: "string" }),
    allEvents: boolean("all_events").notNull().default(true),
    active: boolean("active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("sponsors_logo_media_id_idx").on(table.logoMediaId),
    index("sponsors_deleted_at_idx").on(table.deletedAt),
    // Lo que lee el sitio: visibles, por nivel y orden.
    index("sponsors_tier_sort_order_idx").on(table.tier, table.sortOrder),
  ],
);

/** Eventos de un patrocinador que no lo es de todos. `cascade`: al purgar un evento (o el patrocinador) se va la fila. */
export const sponsorEvents = pgTable(
  "sponsor_events",
  {
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsors.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.sponsorId, table.eventId] }), index("sponsor_events_event_id_idx").on(table.eventId)],
);

export type Sponsor = typeof sponsors.$inferSelect;
