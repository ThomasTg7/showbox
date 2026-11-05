import { z } from "zod";
import { BONUSES, DECISION_TYPES, KO_TKO_TYPES, METHODS, NC_REASONS, OUTCOMES } from "@/domain/bout-enums";
import { MAX_SCORECARDS } from "@/domain/bout-result";
import { optionalEnum, optionalNumber, optionalText } from "@/lib/zod-fields";

// Forma del resultado que llega de un formulario o de la consola en vivo. Aquí solo se convierte el tipo (texto →
// número, vacío → null) con límites amplios: las reglas del resultado y sus mensajes los pone `validateBoutResult`.

const scorecard = z.object({
  judge: z.string().trim().max(80, "El nombre del juez es demasiado largo"),
  red: z.number({ error: "Los puntajes deben ser números enteros" }),
  blue: z.number({ error: "Los puntajes deben ser números enteros" }),
  rounds: z
    .array(
      z.object({
        red: z.number({ error: "Los puntajes deben ser números enteros" }),
        blue: z.number({ error: "Los puntajes deben ser números enteros" }),
        redDeduction: z.number({ error: "Los descuentos deben ser números enteros" }).optional(),
        blueDeduction: z.number({ error: "Los descuentos deben ser números enteros" }).optional(),
      }),
    )
    .max(10, "Demasiados rounds")
    .nullish(),
});

export const boutResultInputSchema = z.object({
  outcome: z.enum(OUTCOMES, { error: "Elige el resultado" }),
  method: z.enum(METHODS, { error: "Elige el método" }),
  koTkoType: optionalEnum(KO_TKO_TYPES, "Elige el tipo de KO/TKO"),
  decisionType: optionalEnum(DECISION_TYPES, "Elige el tipo de decisión"),
  dqReason: optionalText(200, "El motivo"),
  ncReason: optionalEnum(NC_REASONS, "Elige el motivo"),
  ncNote: optionalText(200, "La nota"),
  endRound: optionalNumber("El round", { min: 0, max: 99, integer: true }),
  endTimeSeconds: optionalNumber("El tiempo", { min: 0, max: 3600, integer: true }),
  referee: optionalText(80, "El árbitro"),
  scorecards: z.array(scorecard).max(MAX_SCORECARDS, `Máximo ${MAX_SCORECARDS} tarjetas`).nullish(),
  bonuses: z.array(z.enum(BONUSES, { error: "Bono no válido" })).max(BONUSES.length).nullish(),
  videoUrl: optionalText(300, "El enlace del video"),
  notes: optionalText(600, "Las notas"),
});

export type BoutResultFormInput = z.input<typeof boutResultInputSchema>;
