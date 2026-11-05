import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { events } from "./events";
import { media } from "./media";

export const eventWatchPlatforms = pgTable("event_watch_platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  mediaId: uuid("media_id").references(() => media.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [index("event_watch_platforms_event_sort_idx").on(table.eventId, table.sortOrder), index("event_watch_platforms_media_idx").on(table.mediaId)]);
