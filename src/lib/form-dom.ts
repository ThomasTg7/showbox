// Campos no controlados de un formulario (los de `form-fields.tsx`) leídos y escritos desde otro componente del mismo
// formulario, sin volverlos controlados.

type TextControl = HTMLInputElement | HTMLTextAreaElement;

function textControl(form: HTMLFormElement | null | undefined, name: string): TextControl | null {
  const control = form?.elements.namedItem(name);
  return control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement ? control : null;
}

export function readFormText(form: HTMLFormElement | null | undefined, name: string): string {
  return textControl(form, name)?.value ?? "";
}

/**
 * Escribe el valor como si se hubiera tecleado: usa el `value` nativo y dispara `input`, así React llama al `onChange`
 * del campo (el contador de caracteres) y quien escucha el formulario (la vista previa) se entera.
 */
export function writeFormText(form: HTMLFormElement | null | undefined, name: string, value: string): void {
  const control = textControl(form, name);
  if (!control) return;
  const prototype = control instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
}
