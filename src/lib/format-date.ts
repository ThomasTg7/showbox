// Zona horaria fija: el servidor (Vercel corre en UTC) y el navegador deben
// mostrar el mismo día; si no, hay desfase de fecha y errores de hidratación.
const TIME_ZONE = "America/Guayaquil";

const dateFormatter = new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeZone: TIME_ZONE });
const dateTimeFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "medium",
  timeStyle: "short",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

const timeFormatter = new Intl.DateTimeFormat("es-EC", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });
const shortDateFormatter = new Intl.DateTimeFormat("es-EC", { weekday: "short", day: "numeric", month: "short", timeZone: TIME_ZONE });
const longDateFormatter = new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE });

/** Hora de Ecuador: "21:00". */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** "sáb 24 oct" (día de Ecuador). */
export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date).replace(",", "");
}

const posterDateFormatter = new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });

/** "sábado - 14 - noviembre": la fecha como en los afiches ShowBox (día de Ecuador). */
export function formatPosterDate(date: Date): string {
  const parts = Object.fromEntries(posterDateFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.weekday} - ${parts.day} - ${parts.month}`;
}

/** "sábado 24 de octubre de 2026" (día de Ecuador). */
export function formatLongDate(date: Date): string {
  return longDateFormatter.format(date).replace(",", "");
}
