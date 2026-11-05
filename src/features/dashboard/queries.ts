import { and, asc, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { posts } from "@/db/schema/posts";
import { upcomingEvents } from "@/features/events/event-scope";
import { countNewInbox } from "@/features/inbox/queries";
import { listIneligibleWarnings } from "@/features/rankings/warnings";

/** Cuántos borradores y programados muestra el inicio: lo más reciente; el resto está en cada listado. */
const LIST_SIZE = 8;

export type DashboardItemType = "fighter" | "event" | "post";
export type DashboardItem = { type: DashboardItemType; id: string; title: string };
export type DashboardScheduledItem = DashboardItem & { publishAt: Date };

export type Dashboard = {
  /** El evento más cercano que aún no pasa, con sus peleas (sin contar las canceladas); `null` si no hay. */
  nextEvent: { id: string; name: string; startsAt: Date; boutsCount: number } | null;
  /** Mensajes de la bandeja que nadie ha respondido. */
  newInbox: number;
  drafts: DashboardItem[];
  scheduled: DashboardScheduledItem[];
  /** Boxeadores rankeados (o campeones) que el sitio ya no muestra; la promotora los resuelve en Rankings. */
  rankingWarnings: string[];
};

type Row = { type: DashboardItemType; id: string; title: string; updatedAt: Date; publishAt: Date | null };

/** Boxeadores, eventos y noticias en un estado de publicación, fuera de la papelera: una consulta por tipo, en paralelo. */
async function listByStatus(db: Db, status: "draft" | "scheduled", order: "recent" | "soonest"): Promise<Row[]> {
  const orderBy = (updatedAt: AnyPgColumn, publishAt: AnyPgColumn) => (order === "recent" ? desc(updatedAt) : asc(publishAt));
  // Una programada con su hora ya pasada es pública desde ya (no está «por publicarse»).
  const scheduled = (publishAt: AnyPgColumn) => (status === "scheduled" ? gt(publishAt, sql`now()`) : undefined);

  const [fighterRows, eventRows, postRows] = await Promise.all([
    db
      .select({ id: fighters.id, title: sql<string>`${fighters.firstName} || ' ' || ${fighters.lastName}`, updatedAt: fighters.updatedAt, publishAt: fighters.publishAt })
      .from(fighters)
      .where(and(eq(fighters.status, status), isNull(fighters.deletedAt), scheduled(fighters.publishAt)))
      .orderBy(orderBy(fighters.updatedAt, fighters.publishAt))
      .limit(LIST_SIZE),
    db
      .select({ id: events.id, title: events.name, updatedAt: events.updatedAt, publishAt: events.publishAt })
      .from(events)
      .where(and(eq(events.status, status), isNull(events.deletedAt), scheduled(events.publishAt)))
      .orderBy(orderBy(events.updatedAt, events.publishAt))
      .limit(LIST_SIZE),
    db
      .select({ id: posts.id, title: posts.title, updatedAt: posts.updatedAt, publishAt: posts.publishAt })
      .from(posts)
      .where(and(eq(posts.status, status), isNull(posts.deletedAt), scheduled(posts.publishAt)))
      .orderBy(orderBy(posts.updatedAt, posts.publishAt))
      .limit(LIST_SIZE),
  ]);
  return [
    ...fighterRows.map((row): Row => ({ type: "fighter", ...row })),
    ...eventRows.map((row): Row => ({ type: "event", ...row })),
    ...postRows.map((row): Row => ({ type: "post", ...row })),
  ];
}

async function getNextEvent(db: Db): Promise<Dashboard["nextEvent"]> {
  const [row] = await db
    .select({
      id: events.id,
      name: events.name,
      startsAt: events.startsAt,
      // Va con los nombres escritos a mano: en una consulta de una sola tabla drizzle omite el prefijo de las columnas.
      boutsCount: sql<number>`(select count(*)::int from "bouts" where "bouts"."event_id" = "events"."id" and "bouts"."bout_status" <> 'cancelled')`,
    })
    .from(events)
    .where(and(isNull(events.deletedAt), ne(events.eventStatus, "cancelled"), upcomingEvents()))
    .orderBy(asc(events.startsAt), asc(events.id))
    .limit(1);
  return row ?? null;
}

/** Todo lo que muestra el Inicio del panel. */
export async function getDashboard(db: Db): Promise<Dashboard> {
  const [nextEvent, newInbox, drafts, scheduled, rankingWarnings] = await Promise.all([
    getNextEvent(db),
    countNewInbox(db),
    listByStatus(db, "draft", "recent"),
    listByStatus(db, "scheduled", "soonest"),
    listIneligibleWarnings(db),
  ]);

  return {
    nextEvent,
    newInbox,
    drafts: drafts
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, LIST_SIZE)
      .map(({ type, id, title }) => ({ type, id, title })),
    scheduled: scheduled
      .sort((a, b) => a.publishAt!.getTime() - b.publishAt!.getTime())
      .slice(0, LIST_SIZE)
      .map(({ type, id, title, publishAt }) => ({ type, id, title, publishAt: publishAt! })),
    rankingWarnings,
  };
}
