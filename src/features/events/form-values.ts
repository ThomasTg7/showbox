import type { Event } from "@/db/schema/events";
import { toLocalInputs } from "@/lib/local-time";

/** Los formularios HTML solo manejan texto: cada campo del evento como string (vacío = sin dato). */
export type EventFormValues = Record<string, string>;

const text = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

export const EMPTY_EVENT_VALUES: EventFormValues = {
  name: "",
  number: "",
  slug: "",
  eventStatus: "scheduled",
  startsDate: "",
  startsTime: "21:00",
  doorsTime: "",
  endsTime: "",
  venueName: "",
  venueAddress: "",
  venueCity: "",
  mapsUrl: "",
  ticketUrl: "",
  ticketProvider: "",
  ticketPoints: "",
  streamUrl: "",
};

export function eventToFormValues(event: Event): EventFormValues {
  const starts = toLocalInputs(event.startsAt);
  return {
    name: event.name,
    number: text(event.number),
    slug: event.slug,
    eventStatus: event.eventStatus,
    startsDate: starts.date,
    startsTime: starts.time,
    doorsTime: event.doorsAt ? toLocalInputs(event.doorsAt).time : "",
    endsTime: event.endsEstimatedAt ? toLocalInputs(event.endsEstimatedAt).time : "",
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    venueCity: event.venueCity,
    mapsUrl: event.lat !== null && event.lng !== null ? `https://www.google.com/maps?q=${event.lat},${event.lng}` : "",
    ticketUrl: text(event.ticketUrl),
    ticketProvider: text(event.ticketProvider),
    ticketPoints: text(event.ticketPoints),
    streamUrl: text(event.streamUrl),
  };
}

/** Pestaña donde vive cada campo: si falla la validación, el formulario abre la primera pestaña con error. */
export const EVENT_FIELD_TABS = {
  data: ["name", "number", "slug", "eventStatus"],
  place: ["startsDate", "startsTime", "doorsTime", "endsTime", "venueName", "venueAddress", "venueCity", "mapsUrl"],
  images: ["heroMediaId", "heroMobileMediaId", "posterMediaId", "galleryMediaIds"],
  tickets: ["ticketUrl", "ticketProvider", "ticketTiers", "ticketPoints"],
  watch: ["watchPlatforms", "streamUrl"],
  publication: ["status", "publishAt"],
} as const;

export type EventTab = keyof typeof EVENT_FIELD_TABS;

export function tabForEventField(field: string): EventTab | null {
  for (const [tab, fields] of Object.entries(EVENT_FIELD_TABS)) {
    if ((fields as readonly string[]).includes(field)) return tab as EventTab;
  }
  return null;
}
