import type { ZodError } from "zod";

/** Estado que devuelven las server actions de formularios: mensaje general y/o un error por campo. */
export type FormActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /** Lo que la persona escribió, para volver a mostrarlo: React 19 vacía el formulario tras cada action. */
  values?: Record<string, string>;
  /**
   * Adónde ir tras guardar (p. ej. la edición de lo recién creado). Lo hace el cliente con el router: un `redirect()`
   * dentro de la action lo resuelve Next sin pasar por el proxy, y en el subdominio del panel caería en otra ruta.
   */
  redirectTo?: string;
};

/** Primer mensaje de cada campo (`path[0]`) para mostrarlo junto al input. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/** Todos los valores de un campo repetido (p. ej. un id por foto de la galería, en el orden mostrado). */
export function formList(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((value): value is string => typeof value === "string");
}
