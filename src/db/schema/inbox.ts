import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const inboxKind = pgEnum("inbox_kind", ["fighter_application", "sponsorship"]);
export const inboxStatus = pgEnum("inbox_status", ["new", "contacted", "discarded"]);

/** Lo que cada formulario guarda además de los datos de contacto (que viven en columnas). */
export type FighterApplicationPayload = { birthDate: string; weightKg: number; record: string | null; gym: string | null; videoLinks: string[]; message: string | null };
export type SponsorshipPayload = { contactName: string; message: string | null };

/**
 * Bandeja: postulaciones «Quiero pelear» y contactos de patrocinio. `name` es el nombre de quien postula o la empresa;
 * `consent_at` guarda cuándo aceptó la política de privacidad.
 */
export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: inboxKind("kind").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    payload: jsonb("payload").$type<FighterApplicationPayload | SponsorshipPayload>().notNull(),
    status: inboxStatus("status").notNull().default("new"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // El listado filtra por estado y tipo y siempre ordena por fecha; el contador de «nuevos» usa el estado.
    index("inbox_messages_status_created_at_idx").on(table.status, table.createdAt),
    index("inbox_messages_kind_status_created_at_idx").on(table.kind, table.status, table.createdAt),
  ],
);

/**
 * Envíos por dirección en la última hora. `ip_hash` es el SHA-256 de la IP con sal (nunca la IP). Una fila por dirección:
 * `window_start` es el primer envío de la hora en curso.
 */
export const formRateLimits = pgTable(
  "form_rate_limits",
  {
    ipHash: text("ip_hash").primaryKey(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull(),
  },
  (table) => [index("form_rate_limits_window_start_idx").on(table.windowStart)],
);

export type InboxMessage = typeof inboxMessages.$inferSelect;
