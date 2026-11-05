import { z } from "zod";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const allowedEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El correo es obligatorio")
    .refine((value) => EMAIL_PATTERN.test(value), "Ingresa un correo válido"),
});
