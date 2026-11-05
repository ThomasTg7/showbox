import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { media } from "@/db/schema/media";
import type { MediaKind } from "@/domain/media-specs";
import { seedDivisions } from "@/features/divisions/seed";
import type { FighterFormInput } from "./schema";

/** Boxeador válido mínimo para los tests; `overrides` pisa cualquier campo. */
export function validFighterInput(divisionId: string, overrides: Partial<FighterFormInput> = {}): FighterFormInput {
  return { firstName: "Bryan", lastName: "Cevallos", nickname: "El Martillo", gender: "male", nationality: "CL", divisionId, ...overrides };
}

export async function divisionIdBySlug(db: Db, slug: string): Promise<string> {
  await seedDivisions(db);
  const [row] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.slug, slug));
  if (!row) throw new Error(`No existe la división ${slug}`);
  return row.id;
}

/** Imagen `ready` sin archivos: alcanza para probar referencias y lecturas. */
export async function insertMedia(db: Db, kind: MediaKind, overrides: Partial<typeof media.$inferInsert> = {}): Promise<string> {
  const [row] = await db
    .insert(media)
    .values({ kind, originalKey: `originals/${kind}/test.png`, mime: "image/png", width: 800, height: 1200, status: "ready", ...overrides })
    .returning({ id: media.id });
  return row!.id;
}
