import { z } from "zod";
import { SPONSOR_TIERS, type SponsorTier } from "@/domain/sponsors";
import { isCalendarDay } from "@/lib/local-time";
import { checkbox, optionalHttpUrl } from "@/lib/zod-fields";

/** Id de patrocinador que llega de una action: uuid o nada. */
export const sponsorIdSchema = z.uuid();

/** Día `YYYY-MM-DD` de Ecuador; vacío = `null` (extremo abierto). */
function optionalDay(label: string) {
  return z
    .string()
    .trim()
    .nullish()
    .transform((value, ctx) => {
      if (!value) return null;
      if (!isCalendarDay(value)) {
        ctx.issues.push({ code: "custom", message: `${label} no es una fecha válida`, input: value });
        return z.NEVER;
      }
      return value;
    });
}

export type SponsorData = {
  name: string;
  logoMediaId: string;
  url: string | null;
  tier: SponsorTier;
  startsOn: string | null;
  endsOn: string | null;
  allEvents: boolean;
  active: boolean;
  /** Vacío si el patrocinador es de todos los eventos. */
  eventIds: string[];
};

export const sponsorInputSchema = z
  .object({
    name: z.string({ error: "El nombre es obligatorio" }).trim().min(1, "El nombre es obligatorio").max(80, "El nombre es demasiado largo (máx. 80 caracteres)"),
    logoMediaId: z.uuid({ error: "Sube el logo del patrocinador" }),
    url: optionalHttpUrl("El enlace"),
    tier: z.enum(SPONSOR_TIERS, { error: "Elige un nivel" }),
    startsOn: optionalDay("El inicio"),
    endsOn: optionalDay("El término"),
    allEvents: checkbox(true),
    active: checkbox(true),
    eventIds: z
      .array(z.uuid({ error: "Uno de los eventos no es válido" }))
      .max(50, "Elige hasta 50 eventos")
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .superRefine((value, ctx) => {
    if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) {
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: "El término no puede ser antes del inicio" });
    }
    if (!value.allEvents && value.eventIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["eventIds"], message: "Elige al menos un evento o marca «Todos los eventos»" });
    }
  })
  .transform((value): SponsorData => ({ ...value, eventIds: value.allEvents ? [] : value.eventIds }));

export type SponsorFormInput = z.input<typeof sponsorInputSchema>;
/** Lo que entrega un formulario HTML (textos y la lista de eventos repetida). Se valida y convierte con `sponsorInputSchema`. */
export type SponsorRawInput = SponsorFormInput | Record<string, string | string[]>;

export const reorderSponsorsSchema = z.object({
  tier: z.enum(SPONSOR_TIERS),
  orderedIds: z.array(z.uuid()).min(1).max(200),
});
