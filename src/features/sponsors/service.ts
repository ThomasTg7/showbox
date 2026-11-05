import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { sponsorEvents, sponsors } from "@/db/schema/sponsors";
import type { Executor } from "@/db/types";
import { SPONSOR_TIER_LABELS, type SponsorTier } from "@/domain/sponsors";
import { logAudit } from "@/features/audit/log";
import { sortOrderCase } from "@/features/events/ordering";
import { assertUsableMedia } from "@/features/media/service";
import { UserFacingError } from "@/lib/user-facing-error";
import { getSponsorEventIds } from "./queries";
import { sponsorInputSchema, type SponsorData, type SponsorRawInput } from "./schema";

const NOT_FOUND = "No se encontró el patrocinador";

function parseSponsor(input: SponsorRawInput): SponsorData {
  const parsed = sponsorInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  return parsed.data;
}

/**
 * Un evento nuevo debe existir y estar fuera de la papelera. Los que el patrocinador ya tenía se conservan aunque ahora
 * estén en ella: editar otra cosa no obliga a quitarlos.
 */
async function assertEventsExist(db: Executor, eventIds: string[], kept: string[] = []): Promise<void> {
  const added = eventIds.filter((id) => !kept.includes(id));
  if (added.length === 0) return;
  const found = await db.select({ id: events.id }).from(events).where(and(inArray(events.id, added), isNull(events.deletedAt)));
  if (found.length !== added.length) throw new UserFacingError("Uno de los eventos ya no existe. Quítalo y vuelve a guardar.");
}

async function nextSortOrder(db: Executor, tier: SponsorTier): Promise<number> {
  const [row] = await db
    .select({ next: sql<number>`coalesce(max(${sponsors.sortOrder}) + 1, 0)::int` })
    .from(sponsors)
    .where(and(eq(sponsors.tier, tier), isNull(sponsors.deletedAt)));
  return row?.next ?? 0;
}

async function writeEvents(tx: Executor, sponsorId: string, eventIds: string[]): Promise<void> {
  await tx.delete(sponsorEvents).where(eq(sponsorEvents.sponsorId, sponsorId));
  if (eventIds.length > 0) await tx.insert(sponsorEvents).values(eventIds.map((eventId) => ({ sponsorId, eventId })));
}

function columns(data: SponsorData) {
  return {
    name: data.name,
    logoMediaId: data.logoMediaId,
    url: data.url,
    tier: data.tier,
    startsOn: data.startsOn,
    endsOn: data.endsOn,
    allEvents: data.allEvents,
    active: data.active,
  };
}

export async function createSponsor(db: Db, input: SponsorRawInput, actorId: string): Promise<{ id: string }> {
  const data = parseSponsor(input);
  await assertUsableMedia(db, [{ id: data.logoMediaId, kind: "sponsor_logo" }]);
  await assertEventsExist(db, data.eventIds);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(sponsors)
      .values({ ...columns(data), sortOrder: await nextSortOrder(tx, data.tier) })
      .returning({ id: sponsors.id });
    const id = row!.id;
    await writeEvents(tx, id, data.eventIds);
    await logAudit(tx, { actorId, action: "create", entityType: "sponsor", entityId: id, summary: `Creó el patrocinador ${data.name}` });
    return { id };
  });
}

export async function updateSponsor(db: Db, id: string, input: SponsorRawInput, actorId: string): Promise<void> {
  const data = parseSponsor(input);
  await assertUsableMedia(db, [{ id: data.logoMediaId, kind: "sponsor_logo" }]);

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ tier: sponsors.tier, sortOrder: sponsors.sortOrder })
      .from(sponsors)
      .where(and(eq(sponsors.id, id), isNull(sponsors.deletedAt)))
      .limit(1);
    if (!current) throw new UserFacingError(NOT_FOUND);
    await assertEventsExist(tx, data.eventIds, await getSponsorEventIds(tx, id));

    // Al cambiar de nivel pasa al final del nuevo; dentro del mismo conserva su lugar.
    const sortOrder = current.tier === data.tier ? current.sortOrder : await nextSortOrder(tx, data.tier);
    await tx.update(sponsors).set({ ...columns(data), sortOrder, updatedAt: new Date() }).where(eq(sponsors.id, id));
    await writeEvents(tx, id, data.eventIds);
    await logAudit(tx, { actorId, action: "update", entityType: "sponsor", entityId: id, summary: `Editó el patrocinador ${data.name}` });
  });
}

/**
 * Guarda el orden de un nivel (posición en la lista = `sort_order`, 0..n-1). La lista debe ser exactamente la de los
 * patrocinadores del nivel: si otra persona agregó o quitó uno mientras tanto, se rechaza en vez de dejar un orden a medias.
 */
export async function reorderSponsors(db: Db, tier: SponsorTier, orderedIds: string[], actorId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await tx
      .select({ id: sponsors.id })
      .from(sponsors)
      .where(and(eq(sponsors.tier, tier), isNull(sponsors.deletedAt)));
    const currentIds = new Set(current.map((row) => row.id));
    if (new Set(orderedIds).size !== orderedIds.length || orderedIds.length !== currentIds.size || orderedIds.some((id) => !currentIds.has(id))) {
      throw new UserFacingError("La lista cambió mientras la ordenabas. Recarga la página e inténtalo de nuevo.");
    }
    await tx.update(sponsors).set({ sortOrder: sortOrderCase(sponsors.id, orderedIds) }).where(inArray(sponsors.id, orderedIds));
    await logAudit(tx, { actorId, action: "update", entityType: "sponsor", entityId: tier, summary: `Reordenó los patrocinadores ${SPONSOR_TIER_LABELS[tier].toLowerCase()}es` });
  });
}
