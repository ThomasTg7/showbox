import { formValues, type FormActionState } from "./form-errors";
import { runUserFacing } from "./user-facing-error";

/**
 * Corre la tarea de una server action de formulario y la convierte en `FormActionState`: un mensaje pensado para la
 * persona llega tal cual; cualquier otro error queda en el log y ve un aviso genérico. Con `formData`, un error
 * devuelve también lo escrito (React 19 vacía el formulario tras cada action).
 */
export async function runFormAction(
  logLabel: string,
  task: () => Promise<FormActionState | void>,
  formData?: FormData,
): Promise<FormActionState> {
  const result = await runUserFacing(logLabel, task);
  if ("value" in result) return result.value ?? {};
  return { error: result.error, ...(formData ? { values: formValues(formData) } : {}) };
}
