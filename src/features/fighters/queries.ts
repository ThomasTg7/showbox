import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { publicScope } from "@/db/public-scope";
import { divisions } from "@/db/schema/divisions";
import { fighters, type Fighter } from "@/db/schema/fighters";
import type { MediaDTO } from "@/features/media/dto";
import type { FighterCardDTO, FighterProfileDTO, ManualRecord } from "./dto";
import { fighterPhotoIds, fighterPhotos, filterConditions, galleryIds, loadMedia, pageWindow, type PageOptions } from "./query-helpers";
import type { FighterFilters } from "./schema";

const PUBLIC_PAGE_SIZE = 24;

type PreviewOptions = { preview?: boolean };

const cardColumns = {
  id: fighters.id,
  slug: fighters.slug,
  firstName: fighters.firstName,
  lastName: fighters.lastName,
  nickname: fighters.nickname,
  gender: fighters.gender,
  nationality: fighters.nationality,
  careerStatus: fighters.careerStatus,
  proWins: fighters.proWins,
  proLosses: fighters.proLosses,
  proDraws: fighters.proDraws,
  proNoContests: fighters.proNoContests,
  bodyMediaId: fighters.bodyMediaId,
  headshotMediaId: fighters.headshotMediaId,
  divisionName: divisions.name,
  divisionSlug: divisions.slug,
  divisionLimitKg: divisions.limitKg,
  divisionGender: divisions.gender,
};

function manualRecord(wins: number, losses: number, draws: number, noContests: number): ManualRecord {
  return { wins, losses, draws, noContests };
}

type CardRow = Pick<Fighter, "id" | "slug" | "firstName" | "lastName" | "nickname" | "gender" | "nationality" | "careerStatus" | "proWins" | "proLosses" | "proDraws" | "proNoContests" | "bodyMediaId" | "headshotMediaId"> & {
  divisionName: string;
  divisionSlug: string;
  divisionLimitKg: number;
  divisionGender: "male" | "female";
};

function toCard(row: CardRow, mediaById: Map<string, MediaDTO>): FighterCardDTO {
  return {
    id: row.id,
    slug: row.slug,
    firstName: row.firstName,
    lastName: row.lastName,
    nickname: row.nickname,
    gender: row.gender,
    nationality: row.nationality,
    careerStatus: row.careerStatus,
    division: { name: row.divisionName, slug: row.divisionSlug, limitKg: row.divisionLimitKg, gender: row.divisionGender },
    record: manualRecord(row.proWins, row.proLosses, row.proDraws, row.proNoContests),
    ...fighterPhotos(mediaById, row),
  };
}

/** Listado público (solo publicados). Con `preview` incluye borradores; nunca lo que está en la papelera. */
export async function listPublicFighters(
  db: Db,
  filters: FighterFilters,
  options: PageOptions & PreviewOptions = {},
): Promise<{ items: FighterCardDTO[]; hasMore: boolean }> {
  const { limit, offset, size } = pageWindow(options, PUBLIC_PAGE_SIZE);
  const rows = await db
    .select(cardColumns)
    .from(fighters)
    .innerJoin(divisions, eq(fighters.divisionId, divisions.id))
    .where(and(options.preview ? isNull(fighters.deletedAt) : publicScope(fighters), ...filterConditions(filters)))
    .orderBy(asc(fighters.lastName), asc(fighters.firstName), asc(fighters.id))
    .limit(limit)
    .offset(offset);

  const page = rows.slice(0, size);
  const mediaById = await loadMedia(db, fighterPhotoIds(page));
  return { items: page.map((row) => toCard(row, mediaById)), hasMore: rows.length > size };
}

/**
 * Las tarjetas de estos boxeadores, en el orden pedido (los destacados de la home). Solo los que se ven hoy en el sitio: un
 * id que ya no es público se omite. Una consulta y una lectura de fotos, nunca una por boxeador.
 */
export async function listPublicFighterCardsByIds(db: Db, ids: string[]): Promise<FighterCardDTO[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const rows = await db
    .select(cardColumns)
    .from(fighters)
    .innerJoin(divisions, eq(fighters.divisionId, divisions.id))
    .where(and(inArray(fighters.id, unique), publicScope(fighters)));
  const mediaById = await loadMedia(db, fighterPhotoIds(rows));
  const byId = new Map(rows.map((row) => [row.id, toCard(row, mediaById)]));
  return unique.flatMap((id) => byId.get(id) ?? []);
}

export async function getPublicFighterBySlug(
  db: Db,
  slug: string,
  { preview = false }: PreviewOptions = {},
): Promise<FighterProfileDTO | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      birthDate: fighters.birthDate,
      hometown: fighters.hometown,
      weightKg: fighters.weightKg,
      heightCm: fighters.heightCm,
      reachCm: fighters.reachCm,
      stance: fighters.stance,
      gym: fighters.gym,
      coach: fighters.coach,
      baseDiscipline: fighters.baseDiscipline,
      bio: fighters.bio,
      socials: fighters.socials,
      amWins: fighters.amWins,
      amLosses: fighters.amLosses,
      amDraws: fighters.amDraws,
      amNoContests: fighters.amNoContests,
    })
    .from(fighters)
    .innerJoin(divisions, eq(fighters.divisionId, divisions.id))
    .where(and(eq(fighters.slug, slug), preview ? isNull(fighters.deletedAt) : publicScope(fighters)))
    .limit(1);
  if (!row) return null;

  const gallery = await galleryIds(db, row.id);
  const mediaById = await loadMedia(db, [row.bodyMediaId, row.headshotMediaId, ...gallery]);
  const card = toCard(row, mediaById);
  return {
    ...card,
    birthDate: row.birthDate,
    hometown: row.hometown,
    weightKg: row.weightKg,
    heightCm: row.heightCm,
    reachCm: row.reachCm,
    stance: row.stance,
    gym: row.gym,
    coach: row.coach,
    baseDiscipline: row.baseDiscipline,
    bio: row.bio,
    socials: row.socials,
    proRecord: card.record,
    amateurRecord: manualRecord(row.amWins, row.amLosses, row.amDraws, row.amNoContests),
    gallery: gallery.flatMap((id) => mediaById.get(id) ?? []),
  };
}

export type PublicFilterOptions = {
  divisions: { slug: string; name: string; gender: "male" | "female"; limitKg: number }[];
  /** Códigos ISO de los países que tienen boxeadores publicados. */
  nationalities: string[];
};

/** Opciones de los filtros públicos: solo lo que tiene resultados, para no ofrecer filtros que dan una lista vacía. */
export async function listPublicFilterOptions(db: Db): Promise<PublicFilterOptions> {
  const [divisionRows, nationalityRows] = await Promise.all([
    db
      .selectDistinct({ slug: divisions.slug, name: divisions.name, gender: divisions.gender, limitKg: divisions.limitKg, sortOrder: divisions.sortOrder })
      .from(fighters)
      .innerJoin(divisions, eq(fighters.divisionId, divisions.id))
      .where(publicScope(fighters))
      .orderBy(asc(divisions.gender), asc(divisions.sortOrder)),
    db.selectDistinct({ nationality: fighters.nationality }).from(fighters).where(publicScope(fighters)).orderBy(asc(fighters.nationality)),
  ]);
  return {
    divisions: divisionRows.map(({ sortOrder: _sortOrder, ...division }) => division),
    nationalities: nationalityRows.map((row) => row.nationality),
  };
}

/** Lectura mínima (una fila por índice único) para saber si la ficha es pública y qué etiquetas de caché lleva. */
export async function getPublicFighterRef(
  db: Db,
  slug: string,
): Promise<{ id: string; bodyMediaId: string | null; headshotMediaId: string | null } | null> {
  const [row] = await db
    .select({ id: fighters.id, bodyMediaId: fighters.bodyMediaId, headshotMediaId: fighters.headshotMediaId })
    .from(fighters)
    .where(and(eq(fighters.slug, slug), publicScope(fighters)))
    .limit(1);
  return row ?? null;
}
