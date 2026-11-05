import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  BONUSES,
  BOUT_CORNERS,
  BOUT_LEVELS,
  BOUT_STATUSES,
  DECISION_TYPES,
  EVENT_STATUSES,
  KO_TKO_TYPES,
  METHODS,
  NC_REASONS,
  OUTCOMES,
} from "@/domain/bout-enums";
import type { NormalizedResult, Scorecard } from "@/domain/bout-result";
import { publication, timestamps } from "./_columns";
import { divisions } from "./divisions";
import { fighters } from "./fighters";
import { media } from "./media";

export const eventStatus = pgEnum("event_status", EVENT_STATUSES);
export const boutStatus = pgEnum("bout_status", BOUT_STATUSES);
export const boutLevel = pgEnum("bout_level", BOUT_LEVELS);
export const boutCorner = pgEnum("bout_corner", BOUT_CORNERS);
export const boutOutcome = pgEnum("outcome", OUTCOMES);
export const boutMethod = pgEnum("method", METHODS);
export const koTkoType = pgEnum("ko_tko_type", KO_TKO_TYPES);
export const decisionType = pgEnum("decision_type", DECISION_TYPES);
export const ncReason = pgEnum("nc_reason", NC_REASONS);
export const boutBonus = pgEnum("bonus", BONUSES);

/** Un tramo de entradas: el precio va en dólares enteros. */
export type TicketTier = { name: string; description: string; priceClp: number; soldOut: boolean };

/** Resultado que había antes de anularlo (se conserva para poder consultarlo). */
export type OverturnedResult = Omit<NormalizedResult, "referee" | "videoUrl" | "notes"> & { note: string };

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    number: integer("number"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    doorsAt: timestamp("doors_at", { withTimezone: true }),
    endsEstimatedAt: timestamp("ends_estimated_at", { withTimezone: true }),
    venueName: text("venue_name").notNull(),
    venueAddress: text("venue_address").notNull(),
    venueCity: text("venue_city").notNull(),
    lat: numeric("lat", { precision: 9, scale: 6, mode: "number" }),
    lng: numeric("lng", { precision: 9, scale: 6, mode: "number" }),
    heroMediaId: uuid("hero_media_id").references(() => media.id, { onDelete: "restrict" }),
    heroMobileMediaId: uuid("hero_mobile_media_id").references(() => media.id, { onDelete: "restrict" }),
    posterMediaId: uuid("poster_media_id").references(() => media.id, { onDelete: "restrict" }),
    ticketUrl: text("ticket_url"),
    ticketProvider: text("ticket_provider"),
    ticketTiers: jsonb("ticket_tiers").$type<TicketTier[]>().notNull().default([]),
    ticketPoints: text("ticket_points"),
    streamUrl: text("stream_url"),
    eventStatus: eventStatus("event_status").notNull().default("scheduled"),
    ...publication,
    ...timestamps,
  },
  (table) => [
    // slug ya tiene índice único; el resto sirve a listados, papelera y a la lectura pública.
    index("events_status_idx").on(table.status),
    index("events_publish_at_idx").on(table.publishAt),
    index("events_deleted_at_idx").on(table.deletedAt),
    index("events_starts_at_idx").on(table.startsAt),
    index("events_event_status_idx").on(table.eventStatus),
    index("events_hero_media_id_idx").on(table.heroMediaId),
    index("events_hero_mobile_media_id_idx").on(table.heroMobileMediaId),
    index("events_poster_media_id_idx").on(table.posterMediaId),
  ],
);

export const eventGallery = pgTable(
  "event_gallery",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.mediaId] }), index("event_gallery_media_id_idx").on(table.mediaId)],
);

export const cardSegments = pgTable(
  "card_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
  },
  (table) => [index("card_segments_event_sort_idx").on(table.eventId, table.sortOrder)],
);

export const bouts = pgTable(
  "bouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => cardSegments.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    // `restrict`: un boxeador con peleas no se puede purgar (deleteFighter lo rechaza antes, con un mensaje claro).
    redFighterId: uuid("red_fighter_id")
      .notNull()
      .references(() => fighters.id, { onDelete: "restrict" }),
    blueFighterId: uuid("blue_fighter_id")
      .notNull()
      .references(() => fighters.id, { onDelete: "restrict" }),
    divisionId: uuid("division_id").references(() => divisions.id),
    catchweightKg: numeric("catchweight_kg", { precision: 5, scale: 1, mode: "number" }),
    level: boutLevel("level").notNull().default("pro"),
    scheduledRounds: integer("scheduled_rounds").notNull().default(6),
    roundSeconds: integer("round_seconds").notNull().default(180),
    isTitleFight: boolean("is_title_fight").notNull().default(false),
    // En una pelea por el título, la esquina del campeón (el retador es la otra); por defecto la roja.
    championCorner: boutCorner("champion_corner").notNull().default("red"),
    boutStatus: boutStatus("bout_status").notNull().default("scheduled"),
    cancelReason: text("cancel_reason"),
    outcome: boutOutcome("outcome"),
    method: boutMethod("method"),
    koTkoType: koTkoType("ko_tko_type"),
    decisionType: decisionType("decision_type"),
    dqReason: text("dq_reason"),
    ncReason: ncReason("nc_reason"),
    ncNote: text("nc_note"),
    endRound: integer("end_round"),
    endTimeSeconds: integer("end_time_seconds"),
    referee: text("referee"),
    scorecards: jsonb("scorecards").$type<Scorecard[] | null>(),
    bonuses: boutBonus("bonuses").array().notNull().default(sql`'{}'`),
    overturnedFrom: jsonb("overturned_from").$type<OverturnedResult | null>(),
    videoUrl: text("video_url"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    check("bouts_corners_differ", sql`${table.redFighterId} <> ${table.blueFighterId}`),
    check("bouts_scheduled_rounds_valid", sql`${table.scheduledRounds} in (3, 4, 5, 6, 8, 10, 12)`),
    check("bouts_round_seconds_valid", sql`${table.roundSeconds} between 60 and 300`),
    index("bouts_event_id_idx").on(table.eventId),
    index("bouts_segment_sort_idx").on(table.segmentId, table.sortOrder),
    index("bouts_red_fighter_id_idx").on(table.redFighterId),
    index("bouts_blue_fighter_id_idx").on(table.blueFighterId),
    index("bouts_division_id_idx").on(table.divisionId),
    index("bouts_bout_status_idx").on(table.boutStatus),
  ],
);

export type Event = typeof events.$inferSelect;
export type Bout = typeof bouts.$inferSelect;
export type CardSegment = typeof cardSegments.$inferSelect;
