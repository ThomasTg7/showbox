import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Configuración del sitio: una fila por clave, con el valor como JSON. Cada clave tiene su forma en
 * `src/features/settings/registry.ts` (Zod); la base no la conoce, así que agregar una clave no pide migración.
 */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
