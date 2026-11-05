import { z } from "zod";
import { isPhoneLike } from "@/domain/phone";
import { EMPTY_POST_BODY, validatePostBody, type PostBody } from "@/domain/post-body";
import { socialUrl, type SiteSocialNetwork } from "@/domain/socials";
import { optionalImageId } from "@/lib/zod-fields";

// Un solo lugar define qué claves tiene la configuración del sitio y qué forma tiene cada una. Cada campo trae su valor
// vacío por defecto: `parseSetting(key, {})` da los valores de una instalación nueva y una fila vieja con campos de menos
// (o de más) sigue leyéndose.

const GOOGLE_META_CONTENT = /content\s*=\s*["']([^"']+)["']/i;

function text(max: number, label: string) {
  return z.string().trim().max(max, `${label} es demasiado largo (máx. ${max} caracteres)`).default("");
}

function emailText(label: string) {
  return z
    .string()
    .trim()
    .max(120, `${label} es demasiado largo`)
    .refine((value) => value === "" || z.email().safeParse(value).success, `${label} no es un correo válido`)
    .default("");
}

function phoneText(label: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || isPhoneLike(value), `${label} solo puede llevar números, «+», espacios y guiones (p. ej. +593 99 123 4567)`)
    .default("");
}

function socialProfile(network: SiteSocialNetwork) {
  return z
    .string()
    .trim()
    .max(200, "El enlace es demasiado largo")
    .refine((value) => value === "" || socialUrl(network, value) !== null, "Escribe el usuario (p. ej. @openfightlatam) o el enlace completo del perfil")
    .default("");
}

/** Texto de una página (Nosotros, Privacidad): solo los nodos de una noticia que no son imagen ni publicación de una red. */
const pageBody = z.custom<PostBody>((value) => validatePostBody(value, { allowMedia: false }), "Contenido no permitido").default(EMPTY_POST_BODY);

/** Google entrega la verificación como una etiqueta `<meta … content="código">`: se acepta pegada entera y se guarda el código. */
const googleVerification = z
  .string()
  .trim()
  .transform((value) => GOOGLE_META_CONTENT.exec(value)?.[1]?.trim() ?? value)
  .pipe(z.string().max(120, "El código es demasiado largo").regex(/^[A-Za-z0-9_-]*$/, "El código de Google solo lleva letras, números, «-» y «_»"))
  .default("");

const faqItem = z.object({
  q: z.string().trim().min(1, "Cada respuesta necesita su pregunta").max(200, "Una pregunta es demasiado larga (máx. 200 caracteres)"),
  a: z.string().trim().min(1, "Cada pregunta necesita su respuesta").max(2000, "Una respuesta es demasiado larga (máx. 2000 caracteres)"),
});

export const MAX_FAQ_ITEMS = 30;

export const SETTING_SCHEMAS = {
  about: z.object({ body: pageBody }),
  contact: z.object({
    email: emailText("El correo de contacto"),
    phone: phoneText("El teléfono"),
    whatsapp: phoneText("El WhatsApp"),
    address: text(200, "La dirección"),
    notifyEmail: emailText("El correo de avisos"),
  }),
  socials: z.object({
    instagram: socialProfile("instagram"),
    tiktok: socialProfile("tiktok"),
    youtube: socialProfile("youtube"),
    facebook: socialProfile("facebook"),
    x: socialProfile("x"),
  }),
  ticketsFaq: z.object({ items: z.array(faqItem).max(MAX_FAQ_ITEMS, `Pueden ser hasta ${MAX_FAQ_ITEMS} preguntas`).default([]) }),
  privacy: z.object({
    body: pageBody,
    /** Instante del último cambio del texto (ISO): lo pone el servicio, no el formulario. */
    updatedAt: z.iso
      .datetime()
      .nullish()
      .transform((value) => value ?? null),
  }),
  footer: z.object({ tagline: text(140, "El texto del pie") }),
  share: z.object({ ogMediaId: optionalImageId() }),
  seo: z.object({ googleVerification }),
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;
export type SettingValue<K extends SettingKey> = z.output<(typeof SETTING_SCHEMAS)[K]>;
export type SettingsMap = { [K in SettingKey]: SettingValue<K> };

export const SETTING_KEYS = Object.keys(SETTING_SCHEMAS) as SettingKey[];

/** Nombre de cada grupo de configuración, para el panel y el historial de cambios. */
export const SETTING_LABELS: Record<SettingKey, string> = {
  about: "Nosotros",
  contact: "Contacto",
  socials: "Redes",
  ticketsFaq: "Preguntas de entradas",
  privacy: "Privacidad",
  footer: "Pie de página",
  share: "Imagen al compartir",
  seo: "SEO",
};

export function isSettingKey(value: unknown): value is SettingKey {
  return typeof value === "string" && (SETTING_KEYS as string[]).includes(value);
}

export function parseSetting<K extends SettingKey>(key: K, input: unknown) {
  return SETTING_SCHEMAS[key].safeParse(input) as z.ZodSafeParseResult<SettingValue<K>>;
}

/** Valor de una instalación nueva: todo vacío. */
export function defaultSetting<K extends SettingKey>(key: K): SettingValue<K> {
  const parsed = parseSetting(key, {});
  if (!parsed.success) throw new Error(`El valor vacío de «${key}» no es válido`);
  return parsed.data;
}
