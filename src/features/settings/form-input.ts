import { formList } from "@/lib/form-errors";
import { SETTING_SCHEMAS, type SettingKey } from "./registry";

/** El editor manda el texto como JSON dentro de un campo oculto: vacío = documento vacío; lo que no es JSON queda como texto y el esquema lo rechaza. */
function bodyFromText(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Preguntas y respuestas llegan como dos listas del mismo largo; el par que se dejó vacío (la fila sobrante) no cuenta. */
function faqItems(formData: FormData): { q: string; a: string }[] {
  const answers = formList(formData, "a");
  return formList(formData, "q")
    .map((q, index) => ({ q, a: answers[index] ?? "" }))
    .filter((item) => item.q.trim() !== "" || item.a.trim() !== "");
}

/**
 * Lo que envía el formulario de una clave de la configuración, listo para el esquema de `registry.ts` (que valida y
 * limpia). El resto de los campos (texto simple) se toma por el nombre de cada campo del esquema.
 */
export function settingInputFromForm(key: SettingKey, formData: FormData): unknown {
  if (key === "about" || key === "privacy") return { body: bodyFromText(formData.get("body")) };
  if (key === "ticketsFaq") return { items: faqItems(formData) };
  const fields = Object.keys(SETTING_SCHEMAS[key].shape);
  return Object.fromEntries(fields.map((name) => [name, formData.get(name) ?? ""]));
}
