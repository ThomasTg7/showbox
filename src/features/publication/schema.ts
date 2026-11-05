import { z } from "zod";

export const PUBLICATION_STATUSES = ["draft", "scheduled", "published"] as const;

const dateTimeInput = z.union([z.date(), z.string()]).nullish().transform((value, ctx) => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    ctx.issues.push({ code: "custom", message: "La fecha de publicación no es válida", input: value });
    return z.NEVER;
  }
  return date;
});

const statusSchema = z.enum(PUBLICATION_STATUSES, { error: "Elige cómo se publica" });

/**
 * Campos de publicación dentro de un formulario de entidad (boxeador, evento, noticia). `status` es opcional:
 * al crear falta = borrador; al editar falta = no tocar la publicación. Usar con `requireScheduleDate`.
 */
export const publicationShape = { status: statusSchema.optional(), publishAt: dateTimeInput };

export function requireScheduleDate(
  value: { status?: (typeof PUBLICATION_STATUSES)[number]; publishAt: Date | null },
  ctx: z.core.$RefinementCtx,
): void {
  if (value.status === "scheduled" && value.publishAt === null) {
    ctx.addIssue({ code: "custom", path: ["publishAt"], message: "Elige fecha y hora" });
  }
}

/** Cambio de publicación por sí solo (publicar / despublicar desde un listado). */
export const publicationInputSchema = z.object({ status: statusSchema, publishAt: dateTimeInput }).superRefine(requireScheduleDate);

export type PublicationInput = z.input<typeof publicationInputSchema>;

/** Solo una publicación programada guarda fecha; borrador y publicado la dejan vacía. */
export function normalizePublishAt(value: { status?: string; publishAt: Date | null }): Date | null {
  return value.status === "scheduled" ? value.publishAt : null;
}
