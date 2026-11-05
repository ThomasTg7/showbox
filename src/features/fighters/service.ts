import { and, eq, isNull, ne, or } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { bouts, events } from "@/db/schema/events";
import { fighterGallery, fighters, type FighterSocials } from "@/db/schema/fighters";
import type { Executor } from "@/db/types";
import { normalizeSearchText } from "@/domain/search";
import { slugify, uniqueSlug } from "@/domain/slug";
import { logAudit } from "@/features/audit/log";
import { assertUsableMedia } from "@/features/media/service";
import { getFighterRankingStanding } from "@/features/rankings/warnings";
import { normalizePublishAt, publicationInputSchema, type PublicationInput } from "@/features/publication/schema";
import { softDelete } from "@/features/trash/trash";
import { UserFacingError } from "@/lib/user-facing-error";
import { fighterInputSchema, type FighterData, type FighterRawInput } from "./schema";

const NOT_FOUND = "No se encontró al boxeador";

function parseFighter(input: FighterRawInput): FighterData {
  const parsed = fighterInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }
  return parsed.data;
}

function fullName(data: { firstName: string; lastName: string }): string {
  return `${data.firstName} ${data.lastName}`;
}

/** Columnas editables (sin slug ni publicación, que se resuelven aparte). */
function editableColumns(data: FighterData) {
  const socials: FighterSocials = {};
  for (const network of ["instagram", "tiktok", "youtube", "x"] as const) {
    const handle = data[network];
    if (handle) socials[network] = handle;
  }

  return {
    firstName: data.firstName,
    lastName: data.lastName,
    nickname: data.nickname,
    gender: data.gender,
    birthDate: data.birthDate,
    nationality: data.nationality,
    hometown: data.hometown,
    divisionId: data.divisionId,
    weightKg: data.weightKg,
    heightCm: data.heightCm,
    reachCm: data.reachCm,
    stance: data.stance,
    gym: data.gym,
    coach: data.coach,
    baseDiscipline: data.baseDiscipline,
    bio: data.bio,
    careerStatus: data.careerStatus,
    socials,
    bodyMediaId: data.bodyMediaId,
    headshotMediaId: data.headshotMediaId,
    proWins: data.proWins,
    proLosses: data.proLosses,
    proDraws: data.proDraws,
    proNoContests: data.proNoContests,
    amWins: data.amWins,
    amLosses: data.amLosses,
    amDraws: data.amDraws,
    amNoContests: data.amNoContests,
    searchText: normalizeSearchText([data.firstName, data.lastName, data.nickname].filter(Boolean).join(" ")),
  };
}

/** La división debe existir, coincidir con el género y estar activa (salvo que el boxeador ya la tuviera). */
async function assertDivisionFits(db: Db, data: FighterData, currentDivisionId?: string): Promise<void> {
  const [division] = await db
    .select({ gender: divisions.gender, active: divisions.active })
    .from(divisions)
    .where(eq(divisions.id, data.divisionId))
    .limit(1);
  if (!division) throw new UserFacingError("Selecciona una división");
  if (division.gender !== data.gender) throw new UserFacingError("La división no corresponde al género del boxeador");
  if (!division.active && data.divisionId !== currentDivisionId) {
    throw new UserFacingError("Esa división está inactiva. Actívala en Divisiones o elige otra.");
  }
}

function imageRefs(data: FighterData) {
  return [
    { id: data.bodyMediaId, kind: "fighter_body" as const },
    { id: data.headshotMediaId, kind: "fighter_headshot" as const },
    ...data.galleryMediaIds.map((id) => ({ id, kind: "gallery" as const })),
  ];
}

/** La galería se reescribe entera, en el orden recibido. */
async function writeGallery(tx: Executor, fighterId: string, mediaIds: string[]): Promise<void> {
  await tx.delete(fighterGallery).where(eq(fighterGallery.fighterId, fighterId));
  if (mediaIds.length > 0) {
    await tx.insert(fighterGallery).values(mediaIds.map((mediaId, sortOrder) => ({ fighterId, mediaId, sortOrder })));
  }
}

async function slugTaken(db: Db, slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: fighters.id })
    .from(fighters)
    .where(exceptId ? and(eq(fighters.slug, slug), ne(fighters.id, exceptId)) : eq(fighters.slug, slug))
    .limit(1);
  return row !== undefined;
}

export async function createFighter(db: Db, input: FighterRawInput, actorId: string): Promise<{ id: string; slug: string }> {
  const data = parseFighter(input);
  await assertDivisionFits(db, data);
  await assertUsableMedia(db, imageRefs(data));

  let slug: string;
  if (data.slug) {
    if (await slugTaken(db, data.slug)) throw new UserFacingError("Ese enlace ya lo usa otro boxeador");
    slug = data.slug;
  } else {
    slug = await uniqueSlug(slugify(fullName(data)) || "boxeador", (candidate) => slugTaken(db, candidate));
  }

  const status = data.status ?? "draft";
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(fighters)
      .values({ ...editableColumns(data), slug, status, publishAt: normalizePublishAt({ status, publishAt: data.publishAt }) })
      .returning({ id: fighters.id });
    if (!created) throw new UserFacingError("No se pudo guardar al boxeador");

    await writeGallery(tx, created.id, data.galleryMediaIds);
    await logAudit(tx, { actorId, action: "create", entityType: "fighter", entityId: created.id, summary: `Creó al boxeador ${fullName(data)}` });
    return { id: created.id, slug };
  });
}

/**
 * Edita al boxeador. El slug publicado no cambia al renombrarlo: solo si `input.slug` trae uno distinto.
 * La publicación solo cambia si `input.status` viene informado.
 */
export async function updateFighter(db: Db, id: string, input: FighterRawInput, actorId: string): Promise<{ slug: string }> {
  const data = parseFighter(input);
  const [current] = await db
    .select({ slug: fighters.slug, divisionId: fighters.divisionId })
    .from(fighters)
    .where(and(eq(fighters.id, id), isNull(fighters.deletedAt)))
    .limit(1);
  if (!current) throw new UserFacingError(NOT_FOUND);

  await assertDivisionFits(db, data, current.divisionId);
  await assertUsableMedia(db, imageRefs(data));

  const slug = data.slug ?? current.slug;
  if (slug !== current.slug && (await slugTaken(db, slug, id))) {
    throw new UserFacingError("Ese enlace ya lo usa otro boxeador");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(fighters)
      .set({
        ...editableColumns(data),
        slug,
        ...(data.status ? { status: data.status, publishAt: normalizePublishAt({ status: data.status, publishAt: data.publishAt }) } : {}),
      })
      .where(eq(fighters.id, id));
    await writeGallery(tx, id, data.galleryMediaIds);
    await logAudit(tx, { actorId, action: "update", entityType: "fighter", entityId: id, summary: `Editó al boxeador ${fullName(data)}` });
  });
  return { slug };
}

const PUBLICATION_LABEL = { draft: "Pasó a borrador a", scheduled: "Programó la publicación de", published: "Publicó a" } as const;

export async function setFighterPublication(db: Db, id: string, input: PublicationInput, actorId: string): Promise<void> {
  const parsed = publicationInputSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { status, publishAt } = parsed.data;

  const [updated] = await db
    .update(fighters)
    .set({ status, publishAt: normalizePublishAt({ status, publishAt }) })
    .where(and(eq(fighters.id, id), isNull(fighters.deletedAt)))
    .returning({ firstName: fighters.firstName, lastName: fighters.lastName });
  if (!updated) throw new UserFacingError(NOT_FOUND);

  await logAudit(db, {
    actorId,
    action: "publish",
    entityType: "fighter",
    entityId: id,
    summary: `${PUBLICATION_LABEL[status]} ${fullName(updated)}`,
  });
}

/**
 * Envía al boxeador a la papelera (se recupera desde Papelera; se elimina solo a los 30 días). Con peleas no se puede:
 * la FK `restrict` de `bouts` impediría purgarlo y el cron fallaría (cuenta también las peleas de eventos en la papelera).
 */
export async function deleteFighter(db: Db, id: string, actorId: string): Promise<void> {
  const standing = await getFighterRankingStanding(db, id);
  if (standing === "champion") throw new UserFacingError("Es campeón: deja vacante el título primero");
  if (standing === "ranked") throw new UserFacingError("Está en el ranking: quítalo primero");

  await db.transaction(async (tx) => {
    // Bloquea al boxeador: armar una pelea con él (que lo lee `FOR SHARE`) espera a que esto termine, y esto espera a que
    // termine una pelea que se está guardando. Así nunca queda en la papelera alguien con una pelea.
    await tx.select({ id: fighters.id }).from(fighters).where(eq(fighters.id, id)).for("update");
    const fights = await tx
      .select({ eventDeletedAt: events.deletedAt })
      .from(bouts)
      .innerJoin(events, eq(events.id, bouts.eventId))
      .where(or(eq(bouts.redFighterId, id), eq(bouts.blueFighterId, id)));
    if (fights.some((fight) => fight.eventDeletedAt === null)) {
      throw new UserFacingError("Tiene peleas registradas: márcalo como Retirado o sácalo de la cartelera primero");
    }
    if (fights.length > 0) {
      throw new UserFacingError("Tiene peleas en un evento que está en la papelera: restáuralo y saca la pelea de la cartelera, o espera a que la papelera lo elimine");
    }

    try {
      await softDelete(tx, "fighter", id, actorId);
    } catch (error) {
      // Solo «no existe o ya estaba en la papelera» se explica así; un fallo de la base sigue su curso (y queda en el log).
      throw error instanceof UserFacingError ? new UserFacingError(NOT_FOUND) : error;
    }
  });
}
