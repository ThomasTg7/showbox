import { index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { MEDIA_KINDS } from "@/domain/media-specs";

export const mediaKind = pgEnum("media_kind", MEDIA_KINDS);
export const mediaStatus = pgEnum("media_status", ["pending", "ready"]);

export type StoredCrop = { x: number; y: number; width: number; height: number };
/** `sharpness` no existe en ediciones guardadas antes de agregarlo: leer con valor por defecto 0. */
export type StoredAdjustments = { brightness: number; contrast: number; saturation: number; sharpness?: number };
/** `height` falta en variantes generadas antes de guardarlo. */
export type StoredVariant = { width: number; height?: number; key: string };

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: mediaKind("kind").notNull(),
    originalKey: text("original_key").notNull(),
    mime: text("mime").notNull(),
    width: integer("width"),
    height: integer("height"),
    crop: jsonb("crop").$type<StoredCrop | null>(),
    rotation: integer("rotation").notNull().default(0),
    focalX: real("focal_x").notNull().default(0.5),
    focalY: real("focal_y").notNull().default(0.5),
    adjustments: jsonb("adjustments")
      .$type<StoredAdjustments>()
      .notNull()
      .default({ brightness: 1, contrast: 1, saturation: 1 }),
    variants: jsonb("variants").$type<StoredVariant[]>().notNull().default([]),
    alt: text("alt").notNull().default(""),
    status: mediaStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // purgeOrphanMedia filtra por estado y antigüedad.
    index("media_status_created_at_idx").on(table.status, table.createdAt),
    index("media_deleted_at_idx").on(table.deletedAt),
  ],
);

export type MediaRow = typeof media.$inferSelect;
