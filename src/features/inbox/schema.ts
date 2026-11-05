import { z } from "zod";
import { isPhoneLike } from "@/domain/phone";
import { isCalendarDay } from "@/lib/local-time";
import { checkbox, isHttpUrl, optionalNumber, optionalText } from "@/lib/zod-fields";

/** Id de un mensaje de la bandeja que llega de la URL o de una action: uuid o nada. */
export const inboxIdSchema = z.uuid();

export const CONSENT_REQUIRED = "Debes aceptar la política de privacidad";
export const MAX_VIDEO_LINKS = 3;

const name = (message: string) => z.string({ error: message }).trim().min(1, message).max(100, "Es demasiado largo (máx. 100 caracteres)");

const email = z
  .string({ error: "Escribe tu correo" })
  .trim()
  .max(120, "El correo es demasiado largo")
  .refine((value) => z.email().safeParse(value).success, "Escribe un correo válido, por ejemplo nombre@correo.cl");

/** Teléfono opcional: vacío = `null`. */
const phone = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value || null)
  .refine((value) => value === null || isPhoneLike(value), "El teléfono solo puede llevar números, «+», espacios y guiones (p. ej. +593 99 123 4567)");

const consent = checkbox().refine((accepted) => accepted, CONSENT_REQUIRED);

/** Fecha de nacimiento `YYYY-MM-DD` de un día que existe y que ya pasó (`today` = hoy en Ecuador). */
function birthDate(today: string) {
  return z
    .string({ error: "Escribe tu fecha de nacimiento" })
    .trim()
    .refine(isCalendarDay, "Escribe tu fecha de nacimiento")
    .refine((value) => value < today, "La fecha de nacimiento no puede ser de hoy ni del futuro");
}

/** Hasta tres enlaces de video: los vacíos se descartan y cada uno debe ser http(s). */
const videoLinks = z
  .array(z.string())
  .default([])
  .transform((links) => links.map((link) => link.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(300, "Un enlace de video es demasiado largo").refine(isHttpUrl, "Un enlace de video no es válido (debe empezar con https://)")).max(MAX_VIDEO_LINKS, `Puedes enviar hasta ${MAX_VIDEO_LINKS} enlaces de video`));

/** Postulación «Quiero pelear». `today` es el día de hoy en Ecuador (`YYYY-MM-DD`). */
export function fighterApplicationSchema(today: string) {
  return z.object({
    name: name("Escribe tu nombre"),
    email,
    phone,
    birthDate: birthDate(today),
    weightKg: optionalNumber("El peso", { min: 30, max: 200 }).refine((value) => value !== null, "Escribe tu peso en kilos").transform((value) => value as number),
    record: optionalText(60, "El récord"),
    gym: optionalText(100, "El gimnasio"),
    videoLinks,
    message: optionalText(1000, "El mensaje"),
    consent,
  });
}

export type FighterApplicationData = z.output<ReturnType<typeof fighterApplicationSchema>>;

/** Contacto de patrocinio. */
export const sponsorshipSchema = z.object({
  company: name("Escribe el nombre de la empresa"),
  contactName: name("Escribe el nombre de la persona de contacto"),
  email,
  phone,
  message: optionalText(2000, "El mensaje"),
  consent,
});

export type SponsorshipData = z.output<typeof sponsorshipSchema>;

export const inboxStatusSchema = z.enum(["new", "contacted", "discarded"]);
export const inboxKindSchema = z.enum(["fighter_application", "sponsorship"]);
