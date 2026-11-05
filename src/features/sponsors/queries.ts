import { and, asc, eq, inArray, isNull, lte, gte, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { sponsorEvents, sponsors } from "@/db/schema/sponsors";
import type { Executor } from "@/db/types";
import { PLACEMENT_TIERS, sponsorValidity, type SponsorPlacement } from "@/domain/sponsors";
import { getMediaByIds } from "@/features/media/queries";
import { toLocalInputs } from "@/lib/local-time";
import type { AdminSponsorRow, SponsorDTO } from "./dto";

const ADMIN_PAGE_SIZE = 50;

export type ListSponsorsOptions = { eventId?: string; now?: Date };

/**
 * Lo que se ve hoy (día de Ecuador) en una ubicación: dentro de su vigencia, activo y fuera de la papelera, de los niveles de
 * esa ubicación y por orden de nivel y de lista. Los de «todos los eventos» salen siempre; los atados a eventos específicos
 * solo en la página de ese evento. Una sola lectura de los logos.
 */
export async function listSponsorsFor(db: Db, placement: SponsorPlacement, { eventId, now = new Date() }: ListSponsorsOptions = {}): Promise<SponsorDTO[]> {
  const today = toLocalInputs(now).date;
  const inScope =
    placement === "event" && eventId
      ? or(eq(sponsors.allEvents, true), sql`exists (select 1 from ${sponsorEvents} where ${sponsorEvents.sponsorId} = ${sponsors.id} and ${sponsorEvents.eventId} = ${eventId})`)
      : eq(sponsors.allEvents, true);

  const rows = await db
    .select({ id: sponsors.id, name: sponsors.name, url: sponsors.url, tier: sponsors.tier, logoMediaId: sponsors.logoMediaId })
    .from(sponsors)
    .where(
      and(
        isNull(sponsors.deletedAt),
        eq(sponsors.active, true),
        inArray(sponsors.tier, [...PLACEMENT_TIERS[placement]]),
        or(isNull(sponsors.startsOn), lte(sponsors.startsOn, today)),
        or(isNull(sponsors.endsOn), gte(sponsors.endsOn, today)),
        inScope,
      ),
    )
    .orderBy(asc(sponsors.tier), asc(sponsors.sortOrder), asc(sponsors.name));

  const logos = await getMediaByIds(db, rows.map((row) => row.logoMediaId));
  // Sin logo no hay nada que mostrar: un patrocinador cuyo logo ya no está se omite.
  return rows.flatMap(({ logoMediaId, ...row }) => {
    const logo = logos.get(logoMediaId);
    return logo ? [{ ...row, logo }] : [];
  });
}

/** Todos los patrocinadores fuera de la papelera, por nivel y orden, con su vigencia de hoy, sus eventos y su logo (una lectura de cada cosa). */
export async function listAdminSponsors(
  db: Db,
  { now = new Date() }: { now?: Date } = {},
  { page = 1, pageSize = ADMIN_PAGE_SIZE }: { page?: number; pageSize?: number } = {},
): Promise<{ items: AdminSponsorRow[]; hasMore: boolean }> {
  const today = toLocalInputs(now).date;
  const rows = await db
    .select()
    .from(sponsors)
    .where(isNull(sponsors.deletedAt))
    .orderBy(asc(sponsors.tier), asc(sponsors.sortOrder), asc(sponsors.name))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  const pageRows = rows.slice(0, pageSize);

  const [links, logos] = await Promise.all([
    pageRows.length === 0
      ? []
      : db
          .select({ sponsorId: sponsorEvents.sponsorId, id: events.id, name: events.name })
          .from(sponsorEvents)
          .innerJoin(events, eq(events.id, sponsorEvents.eventId))
          .where(inArray(sponsorEvents.sponsorId, pageRows.map((row) => row.id)))
          .orderBy(asc(events.startsAt)),
    getMediaByIds(db, pageRows.map((row) => row.logoMediaId)),
  ]);

  const items = pageRows.map((row): AdminSponsorRow => ({
    id: row.id,
    name: row.name,
    url: row.url,
    tier: row.tier,
    sortOrder: row.sortOrder,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    allEvents: row.allEvents,
    active: row.active,
    logo: logos.get(row.logoMediaId) ?? null,
    validity: sponsorValidity(row, today),
    events: links.filter((link) => link.sponsorId === row.id).map(({ id, name }) => ({ id, name })),
  }));
  return { items, hasMore: rows.length > pageSize };
}

/** Ids de los eventos de un patrocinador (para conservar los que ya tenía aunque estén en la papelera). */
export async function getSponsorEventIds(db: Executor, sponsorId: string): Promise<string[]> {
  const rows = await db.select({ eventId: sponsorEvents.eventId }).from(sponsorEvents).where(eq(sponsorEvents.sponsorId, sponsorId));
  return rows.map((row) => row.eventId);
}
