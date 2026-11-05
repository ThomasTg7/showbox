import { z } from "zod";

// Campos de formulario que comparten las entidades (boxeadores, eventos, noticias): todo llega como texto.

export const IMAGE_UNAVAILABLE = "La imagen ya no está disponible. Súbela de nuevo.";

/** Texto opcional: vacío o ausente se guarda como `null`. */
export function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} es demasiado largo (máx. ${max} caracteres)`)
    .nullish()
    .transform((value) => value || null);
}

/** Número opcional que llega como número o como texto de un formulario ("70,3" o "70.3"). */
export function optionalNumber(label: string, { min, max, integer = false }: { min: number; max: number; integer?: boolean }) {
  let bounded = z.number({ error: `${label} debe ser un número` });
  if (integer) bounded = bounded.int(`${label} debe ser un número entero`);
  bounded = bounded.min(min, `${label} no puede ser menor que ${min}`).max(max, `${label} no puede ser mayor que ${max}`);

  return z
    .union([z.number(), z.string()])
    .nullish()
    .transform((value) => {
      if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
      return typeof value === "string" ? Number(value.replace(",", ".")) : value;
    })
    .pipe(bounded.nullable());
}

/**
 * Casilla de formulario: llega como `"on"`/`"true"`/`"false"` o como booleano desde el código. Ausente = `defaultValue` (un HTML
 * no envía las casillas sin marcar: los formularios que necesitan distinguir mandan `"true"`/`"false"` en un campo oculto).
 */
export function checkbox(defaultValue = false) {
  return z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => (value === undefined ? defaultValue : value === true || value === "on" || value === "true"));
}

/** Id de imagen opcional: vacío o ausente se guarda como `null`. */
export function optionalImageId() {
  return z
    .union([z.uuid({ error: IMAGE_UNAVAILABLE }), z.literal("")])
    .nullish()
    .transform((value) => value || null);
}


const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Enlace (slug) que se escribe a mano: vacío = `null` (se genera del nombre o se conserva). */
export function optionalSlug() {
  return z
    .string()
    .trim()
    .max(80, "El enlace es demasiado largo")
    .regex(SLUG_PATTERN, "El enlace solo puede tener letras minúsculas sin tildes, números y guiones")
    .nullish()
    .or(z.literal(""))
    .transform((value) => value || null);
}

/** Un enlace con protocolo http(s): lo demás (`javascript:`, `data:`, texto suelto) no. */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Enlace opcional (ticketera, streaming, video): solo http(s); vacío = `null`. */
export function optionalHttpUrl(label: string) {
  return z
    .string()
    .trim()
    .max(300, `${label} es demasiado largo`)
    .nullish()
    .transform((value, ctx) => {
      if (!value) return null;
      if (isHttpUrl(value)) return value;
      ctx.issues.push({ code: "custom", message: `${label} no es un enlace válido (debe empezar con https://)`, input: value });
      return z.NEVER;
    });
}

/** Opción de una lista cerrada; vacío o ausente = `null`. */
export function optionalEnum<const Values extends readonly [string, ...string[]]>(values: Values, message: string) {
  return z
    .union([z.enum(values, { error: message }), z.literal("")])
    .nullish()
    .transform((value) => (value === "" || value === undefined ? null : value));
}
