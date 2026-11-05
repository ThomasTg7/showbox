import { ADMIN_PASSWORD_MIN_LENGTH } from "./password-policy";

type AuthError = { code?: string | null; status?: number } | null | undefined;

const MESSAGES_BY_CODE: Record<string, string> = {
  EMAIL_NOT_ALLOWED: "Este correo no tiene acceso al panel.",
  INVALID_TOKEN: "El enlace no es válido o ya venció. Pide uno nuevo.",
  PASSWORD_TOO_SHORT: `La contraseña debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`,
};

export function authErrorMessage(error: AuthError, fallback: string): string {
  if (error?.status === 429) {
    return "Demasiados intentos. Espera un minuto y vuelve a probar.";
  }
  return (error?.code && MESSAGES_BY_CODE[error.code]) || fallback;
}
