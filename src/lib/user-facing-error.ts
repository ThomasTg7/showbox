/** Error con un mensaje en español pensado para mostrarse tal cual a la persona (toast o error junto al campo). */
export class UserFacingError extends Error {}

export const GENERIC_ACTION_ERROR = "No se pudo completar la acción. Inténtalo de nuevo.";

/**
 * Corre la tarea de una server action: un `UserFacingError` llega tal cual a la persona; cualquier otro error queda en
 * el log del servidor (con `logLabel`) y la persona ve `fallback`. Cada action arma su respuesta con el resultado.
 */
export async function runUserFacing<T>(
  logLabel: string,
  task: () => Promise<T>,
  fallback: string = GENERIC_ACTION_ERROR,
): Promise<{ value: T } | { error: string }> {
  try {
    return { value: await task() };
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    console.error(logLabel, error);
    return { error: fallback };
  }
}
