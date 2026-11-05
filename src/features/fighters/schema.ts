import { z } from "zod";
import { publicationShape, requireScheduleDate } from "@/features/publication/schema";
import { isCalendarDay } from "@/lib/local-time";
import { IMAGE_UNAVAILABLE, optionalEnum, optionalImageId, optionalNumber, optionalSlug, optionalText } from "@/lib/zod-fields";

/** La bio es breve: se muestra dentro de la tarjeta de la ficha, junto al nombre. */
export const BIO_MAX_LENGTH = 300;

/** Contador del récord manual: vacío cuenta como 0. */
function recordCount(label: string) {
  return optionalNumber(label, { min: 0, max: 999, integer: true }).transform((value) => value ?? 0);
}

const birthDate = z
  .string()
  .nullish()
  .transform((value, ctx) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    if (!isCalendarDay(trimmed) || parsed.getUTCFullYear() < 1900 || parsed.getTime() > Date.now()) {
      ctx.issues.push({ code: "custom", message: "La fecha de nacimiento no es válida", input: value });
      return z.NEVER;
    }
    return trimmed;
  });

export const fighterInputSchema = z
  .object({
    firstName: z.string({ error: "El nombre es obligatorio" }).trim().min(1, "El nombre es obligatorio").max(60, "El nombre es demasiado largo"),
    lastName: z.string({ error: "El apellido es obligatorio" }).trim().min(1, "El apellido es obligatorio").max(60, "El apellido es demasiado largo"),
    nickname: optionalText(40, "El apodo"),
    /** Solo al editar el enlace a mano; vacío = se genera del nombre (al crear) o se conserva (al editar). */
    slug: optionalSlug(),
    gender: z.enum(["male", "female"], { error: "Elige masculino o femenino" }),
    birthDate,
    nationality: z
      .string({ error: "Elige el país" })
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Elige el país")
      .transform((value) => value.toUpperCase()),
    hometown: optionalText(80, "La ciudad"),
    divisionId: z.string({ error: "Selecciona una división" }).pipe(z.uuid({ error: "Selecciona una división" })),
    weightKg: optionalNumber("El peso", { min: 30, max: 200 }),
    heightCm: optionalNumber("La estatura", { min: 100, max: 250, integer: true }),
    reachCm: optionalNumber("El alcance", { min: 100, max: 260, integer: true }),
    stance: optionalEnum(["orthodox", "southpaw", "switch"], "Elige la guardia"),
    gym: optionalText(80, "El gimnasio"),
    coach: optionalText(80, "El entrenador"),
    baseDiscipline: optionalText(60, "El estilo de pelea"),
    bio: optionalText(BIO_MAX_LENGTH, "La biografía"),
    careerStatus: z.enum(["active", "inactive", "retired"], { error: "Elige el estado" }).default("active"),
    instagram: optionalText(200, "Instagram"),
    tiktok: optionalText(200, "TikTok"),
    youtube: optionalText(200, "YouTube"),
    x: optionalText(200, "X"),
    bodyMediaId: optionalImageId(),
    headshotMediaId: optionalImageId(),
    /** Fotos de la galería en el orden mostrado; sin fotos (o sin el campo) la galería queda vacía. */
    galleryMediaIds: z
      .array(z.uuid({ error: IMAGE_UNAVAILABLE }))
      .max(60, "La galería admite hasta 60 fotos")
      .default([])
      .transform((ids) => [...new Set(ids)]),
    proWins: recordCount("Las victorias profesionales"),
    proLosses: recordCount("Las derrotas profesionales"),
    proDraws: recordCount("Los empates profesionales"),
    proNoContests: recordCount("Los sin resultado profesionales"),
    amWins: recordCount("Las victorias amateur"),
    amLosses: recordCount("Las derrotas amateur"),
    amDraws: recordCount("Los empates amateur"),
    amNoContests: recordCount("Los sin resultado amateur"),
    ...publicationShape,
  })
  .superRefine(requireScheduleDate);

export type FighterFormInput = z.input<typeof fighterInputSchema>;
/** Lo que entrega un formulario HTML: solo textos. Se valida y convierte con `fighterInputSchema`. */
export type FighterRawInput = FighterFormInput | Record<string, string | string[]>;
export type FighterData = z.output<typeof fighterInputSchema>;

export type FighterFilters = {
  q?: string;
  /** Slug de la división. */
  division?: string;
  /** Código ISO 3166-1 alfa-2. */
  nationality?: string;
  gender?: "male" | "female";
  status?: "active" | "inactive" | "retired";
};

/** Id de boxeador que llega de la URL o de una action: uuid o nada. */
export const fighterIdSchema = z.uuid();
