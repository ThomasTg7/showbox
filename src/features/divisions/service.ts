import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions, type Division } from "@/db/schema/divisions";
import { fighters } from "@/db/schema/fighters";
import { uniqueSlug } from "@/domain/slug";
import { logAudit } from "@/features/audit/log";
import { UserFacingError } from "@/lib/user-facing-error";
import { divisionInputSchema, type DivisionInput } from "./schema";
import { divisionSlug } from "./slug";

const GENDER_LABEL = { male: "masculina", female: "femenina" } as const;

async function nextSortOrder(db: Db, gender: Division["gender"]): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${divisions.sortOrder}), 0)::int` })
    .from(divisions)
    .where(eq(divisions.gender, gender));
  return (row?.max ?? 0) + 1;
}

/** Crea o actualiza (si trae `id`) una división. El slug se fija al crear y no cambia al renombrar. */
export async function saveDivision(db: Db, input: DivisionInput, actorId: string): Promise<Division> {
  const parsed = divisionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new UserFacingError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }
  const { id, name, gender, limitKg, rankingSlots } = parsed.data;

  if (id) {
    const [current] = await db.select({ gender: divisions.gender }).from(divisions).where(eq(divisions.id, id)).limit(1);
    if (!current) {
      throw new UserFacingError("No se encontró la división");
    }
    const genderChanged = current.gender !== gender;
    if (genderChanged) {
      // Incluye la papelera: al restaurar, el boxeador volvería a una división de otra categoría.
      const [inUse] = await db.select({ id: fighters.id }).from(fighters).where(eq(fighters.divisionId, id)).limit(1);
      if (inUse) throw new UserFacingError("La división tiene boxeadores: no se puede cambiar de categoría");
    }

    const [updated] = await db
      .update(divisions)
      .set({ name, gender, limitKg, rankingSlots, ...(genderChanged ? { sortOrder: await nextSortOrder(db, gender) } : {}) })
      .where(eq(divisions.id, id))
      .returning();
    if (!updated) {
      throw new UserFacingError("No se encontró la división");
    }
    await logAudit(db, {
      actorId,
      action: "update",
      entityType: "division",
      entityId: updated.id,
      summary: `Editó la división ${updated.name} ${GENDER_LABEL[updated.gender]}`,
    });
    return updated;
  }

  const slug = await uniqueSlug(divisionSlug(name, gender), async (candidate) => {
    const [row] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.slug, candidate)).limit(1);
    return row !== undefined;
  });
  const [created] = await db
    .insert(divisions)
    .values({ slug, name, gender, limitKg, rankingSlots, sortOrder: await nextSortOrder(db, gender) })
    .returning();
  if (!created) {
    throw new UserFacingError("No se pudo guardar la división");
  }
  await logAudit(db, {
    actorId,
    action: "create",
    entityType: "division",
    entityId: created.id,
    summary: `Creó la división ${created.name} ${GENDER_LABEL[created.gender]} (${created.limitKg} kg)`,
  });
  return created;
}

export async function toggleDivision(db: Db, id: string, active: boolean, actorId: string): Promise<void> {
  if (!active) {
    const [inUse] = await db
      .select({ id: fighters.id })
      .from(fighters)
      .where(and(eq(fighters.divisionId, id), eq(fighters.careerStatus, "active"), isNull(fighters.deletedAt)))
      .limit(1);
    if (inUse) throw new UserFacingError("La división tiene boxeadores activos");
  }

  const [updated] = await db.update(divisions).set({ active }).where(eq(divisions.id, id)).returning();
  if (!updated) {
    throw new UserFacingError("No se encontró la división");
  }
  await logAudit(db, {
    actorId,
    action: "update",
    entityType: "division",
    entityId: id,
    summary: `${active ? "Activó" : "Desactivó"} la división ${updated.name} ${GENDER_LABEL[updated.gender]}`,
  });
}

/** Guarda el orden de las divisiones de un género (posición en la lista = `sort_order`), en una sola consulta. */
export async function reorderDivisions(
  db: Db,
  gender: Division["gender"],
  orderedIds: string[],
  actorId: string,
): Promise<void> {
  if (orderedIds.length === 0) return;
  const cases = sql.join(
    orderedIds.map((id, index) => sql`when ${divisions.id} = ${id} then ${index + 1}`),
    sql` `,
  );
  await db
    .update(divisions)
    .set({ sortOrder: sql`case ${cases} else ${divisions.sortOrder} end` })
    .where(and(eq(divisions.gender, gender), inArray(divisions.id, orderedIds)));
  await logAudit(db, {
    actorId,
    action: "update",
    entityType: "division",
    entityId: "order",
    summary: `Reordenó las divisiones ${GENDER_LABEL[gender]}s`,
  });
}
