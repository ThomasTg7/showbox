import { z } from "zod";
import type { TicketTier } from "@/db/schema/events";
import { EVENT_STATUSES } from "@/domain/bout-enums";
import { isGoogleMapsLink } from "@/domain/maps-link";
import { publicationShape, requireScheduleDate } from "@/features/publication/schema";
import { addDaysToDate, fromLocalInputs } from "@/lib/local-time";
import { IMAGE_UNAVAILABLE, optionalHttpUrl, optionalImageId, optionalNumber, optionalSlug, optionalText } from "@/lib/zod-fields";
import { watchPlatformsSchema, type WatchPlatformInput } from "./watch-schema";

/** Id de evento (o de bloque o pelea) que llega de la URL o de una action: uuid o nada. */
export const eventIdSchema = z.uuid();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const TIME_MESSAGE = "La hora debe escribirse como HH:mm";

/** Hora escrita como `HH:mm` (hora de Ecuador); vacía = `null`. */
export function optionalTime() {
  return z
    .string()
    .trim()
    .nullish()
    .transform((value, ctx) => {
      if (!value) return null;
      if (!TIME_PATTERN.test(value)) {
        ctx.issues.push({ code: "custom", message: TIME_MESSAGE, input: value });
        return z.NEVER;
      }
      return value;
    });
}

const ticketTierSchema = z.object({
  name: z.string({ error: "Cada tramo necesita un nombre" }).trim().min(1, "Cada tramo necesita un nombre").max(60, "El nombre del tramo es demasiado largo"),
  description: z.string().trim().max(120, "La descripción del tramo es demasiado larga").default(""),
  priceClp: z
    .number({ error: "El precio debe ser un número entero de pesos" })
    .int("El precio debe ser un número entero de pesos")
    .min(0, "El precio no puede ser negativo")
    .max(10_000_000, "El precio es demasiado alto"),
  soldOut: z.boolean().default(false),
});

/** Los tramos llegan como arreglo o como texto JSON (un formulario HTML solo envía texto). */
const ticketTiers = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value ?? [];
    if (!value.trim()) return [];
    try {
      return JSON.parse(value);
    } catch {
      return "no válido";
    }
  },
  z.array(ticketTierSchema, { error: "Los tramos de entradas no son válidos" }).max(12, "Máximo 12 tramos de entradas"),
).default([]);

const eventStatus = z
  .union([z.enum(EVENT_STATUSES, { error: "Elige el estado del evento" }), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

export type EventData = {
  name: string;
  number: number | null;
  slug: string | null;
  startsAt: Date;
  doorsAt: Date | null;
  endsEstimatedAt: Date | null;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  lat: number | null;
  lng: number | null;
  /** El enlace de Google Maps pegado en el formulario; el servicio saca de él `lat` y `lng`. */
  mapsUrl: string | null;
  heroMediaId: string | null;
  heroMobileMediaId: string | null;
  posterMediaId: string | null;
  galleryMediaIds: string[];
  ticketUrl: string | null;
  ticketProvider: string | null;
  ticketTiers: TicketTier[];
  ticketPoints: string | null;
  streamUrl: string | null;
  watchPlatforms?: WatchPlatformInput[];
  eventStatus: (typeof EVENT_STATUSES)[number] | undefined;
  /** El estado que tenía el evento cuando se abrió el formulario: `eventStatus` solo se aplica si el admin lo cambió. */
  eventStatusBefore: (typeof EVENT_STATUSES)[number] | undefined;
  status?: "draft" | "scheduled" | "published";
  publishAt: Date | null;
};

export const eventInputSchema = z
  .object({
    name: z.string({ error: "El nombre es obligatorio" }).trim().min(1, "El nombre es obligatorio").max(80, "El nombre es demasiado largo"),
    number: optionalNumber("El número", { min: 1, max: 9999, integer: true }),
    slug: optionalSlug(),
    /** Fecha (`YYYY-MM-DD`) y hora del inicio, escritas en Ecuador. */
    startsDate: z.string({ error: "Elige la fecha" }).trim().regex(DATE_PATTERN, "Elige la fecha"),
    startsTime: z.string({ error: "Escribe la hora" }).trim().regex(TIME_PATTERN, TIME_MESSAGE),
    /** Apertura de puertas y término estimado: solo la hora, del día del evento (un término antes del inicio cae al día siguiente). */
    doorsTime: optionalTime(),
    endsTime: optionalTime(),
    venueName: z.string({ error: "El recinto es obligatorio" }).trim().min(1, "El recinto es obligatorio").max(80, "El recinto es demasiado largo"),
    venueAddress: z.string({ error: "La dirección es obligatoria" }).trim().min(1, "La dirección es obligatoria").max(160, "La dirección es demasiado larga"),
    venueCity: z.string({ error: "La ciudad es obligatoria" }).trim().min(1, "La ciudad es obligatoria").max(80, "La ciudad es demasiado larga"),
    lat: optionalNumber("La latitud", { min: -90, max: 90 }),
    lng: optionalNumber("La longitud", { min: -180, max: 180 }),
    mapsUrl: optionalHttpUrl("El enlace de Google Maps"),
    heroMediaId: optionalImageId(),
    heroMobileMediaId: optionalImageId(),
    posterMediaId: optionalImageId(),
    galleryMediaIds: z
      .array(z.uuid({ error: IMAGE_UNAVAILABLE }))
      .max(60, "La galería admite hasta 60 fotos")
      .default([])
      .transform((ids) => [...new Set(ids)]),
    ticketUrl: optionalHttpUrl("El enlace de la ticketera"),
    ticketProvider: optionalText(60, "El nombre de la ticketera"),
    ticketTiers,
    ticketPoints: optionalText(600, "Los puntos de venta"),
    streamUrl: optionalHttpUrl("El enlace de la transmisión"),
    watchPlatforms: watchPlatformsSchema,
    eventStatus,
    eventStatusBefore: eventStatus,
    ...publicationShape,
  })
  .superRefine(requireScheduleDate)
  .superRefine((value, ctx) => {
    if (value.mapsUrl && !isGoogleMapsLink(value.mapsUrl)) {
      ctx.addIssue({ code: "custom", path: ["mapsUrl"], message: "Pega un enlace de Google Maps (en Maps toca «Compartir» y copia el enlace)" });
    }
  })
  .superRefine((value, ctx) => {
    if ((value.lat === null) !== (value.lng === null)) {
      ctx.addIssue({ code: "custom", path: [value.lat === null ? "lat" : "lng"], message: "Indica latitud y longitud, o deja ambas vacías" });
    }
  })
  .transform((value, ctx): EventData => {
    const { startsDate, startsTime, doorsTime, endsTime, ...rest } = value;
    const invalid = (path: string, message: string) => {
      ctx.issues.push({ code: "custom", path: [path], message, input: value });
      return z.NEVER;
    };

    const startsAt = fromLocalInputs(startsDate, startsTime);
    if (!startsAt) return invalid("startsDate", "La fecha no es válida");

    let doorsAt: Date | null = null;
    if (doorsTime) {
      doorsAt = fromLocalInputs(startsDate, doorsTime);
      if (!doorsAt || doorsAt.getTime() > startsAt.getTime()) return invalid("doorsTime", "La apertura de puertas no puede ser después del inicio");
    }

    let endsEstimatedAt: Date | null = null;
    if (endsTime) {
      // Una velada que termina después de medianoche escribe una hora «menor» que la de inicio.
      endsEstimatedAt = fromLocalInputs(endsTime <= startsTime ? addDaysToDate(startsDate, 1) : startsDate, endsTime);
    }

    return { ...rest, startsAt, doorsAt, endsEstimatedAt };
  });

export type EventFormInput = z.input<typeof eventInputSchema>;
/** Lo que entrega un formulario HTML (textos y, en la galería, una lista de ids). Se valida y convierte con `eventInputSchema`. */
export type EventRawInput = EventFormInput | Record<string, string | string[]>;
