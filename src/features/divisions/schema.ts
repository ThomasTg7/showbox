import { z } from "zod";

export const divisionInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40, "El nombre es demasiado largo"),
  gender: z.enum(["male", "female"], { error: "Elige masculino o femenino" }),
  limitKg: z
    .number({ error: "Ingresa el límite de peso en kilos" })
    .gt(0, "El límite de peso debe ser mayor que 0")
    .max(200, "El límite de peso no puede pasar de 200 kg"),
  rankingSlots: z
    .number({ error: "Ingresa cuántos puestos tiene el ranking" })
    .int("Los puestos del ranking deben ser un número entero")
    .min(1, "El ranking debe tener al menos 1 puesto")
    .max(15, "El ranking no puede tener más de 15 puestos"),
});

export type DivisionInput = z.input<typeof divisionInputSchema>;

export const toggleDivisionSchema = z.object({ id: z.uuid(), active: z.boolean() });

export const reorderDivisionsSchema = z.object({
  gender: z.enum(["male", "female"]),
  orderedIds: z.array(z.uuid()).min(1).max(50),
});
