import { adminPath } from "@/lib/site-urls";

export const ADMIN_PASSWORD_MIN_LENGTH = 8;

// Página a la que llevan los enlaces de invitación y de recuperación.
export const PASSWORD_LINK_PATH = adminPath("/restablecer");

export type NewPasswordErrors = { password?: string; confirmation?: string };

export function validateNewPassword(password: string, confirmation: string): NewPasswordErrors {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return { password: `Usa al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.` };
  }
  if (password !== confirmation) {
    return { confirmation: "Las contraseñas no coinciden." };
  }
  return {};
}
