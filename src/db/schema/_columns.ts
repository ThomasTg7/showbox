import { pgEnum, timestamp } from "drizzle-orm/pg-core";

export const publicationStatus = pgEnum("publication_status", [
  "draft",
  "scheduled",
  "published",
]);

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const publication = {
  status: publicationStatus("status").notNull().default("draft"),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
