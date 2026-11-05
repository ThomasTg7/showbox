import { z } from "zod";
import { ADMIN_PASSWORD_MIN_LENGTH } from "./password-policy";
import { NAME_MAX_LENGTH } from "./my-account-limits";

export const myNameSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre").max(NAME_MAX_LENGTH, `El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres`),
});

export const myPasswordSchema = z
  .object({
    currentPassword: z.string().max(200).optional(),
    newPassword: z.string().min(ADMIN_PASSWORD_MIN_LENGTH, `Usa al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres`).max(200, "La contraseña es demasiado larga"),
    confirmation: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmation, { message: "Las contraseñas no coinciden", path: ["confirmation"] });
