// Las fechas de publicación y de eventos se escriben en hora de Ecuador (igual que `format-date.ts`): America/Guayaquil, UTC-5 todo el año.
const TIME_ZONE = "America/Guayaquil";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function localParts(timestamp: number): Record<string, number> {
  const parts: Record<string, number> = {};
  for (const { type, value } of partsFormatter.formatToParts(timestamp)) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return parts;
}

/** Diferencia (ms) entre la hora local (Ecuador) y UTC en ese instante: -5 h (se calcula igual por si la zona cambia). */
function localOffsetMs(timestamp: number): number {
  const p = localParts(timestamp);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(timestamp / 1000) * 1000;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

/** Fecha (`YYYY-MM-DD`) y hora (`HH:mm`) escritas en hora de Ecuador → instante real. `null` si falta algo o no existe. */
export function fromLocalInputs(date: string, time: string): Date | null {
  const dateMatch = DATE_PATTERN.exec(date);
  const timeMatch = TIME_PATTERN.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];
  const [hour, minute] = [Number(timeMatch[1]), Number(timeMatch[2])];
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const roundTrip = new Date(asUtc);
  if (roundTrip.getUTCFullYear() !== year || roundTrip.getUTCMonth() !== month - 1 || roundTrip.getUTCDate() !== day || hour > 23 || minute > 59) {
    return null;
  }

  // Dos pasadas: el desfase depende del instante, que a su vez depende del desfase (cambios de horario).
  const firstGuess = asUtc - localOffsetMs(asUtc);
  return new Date(asUtc - localOffsetMs(firstGuess));
}

export function toLocalInputs(instant: Date): { date: string; time: string } {
  const p = localParts(instant.getTime());
  const two = (value: number) => String(value).padStart(2, "0");
  return { date: `${p.year}-${two(p.month)}-${two(p.day)}`, time: `${two(p.hour)}:${two(p.minute)}` };
}

/** El instante con el desfase de Ecuador (`2031-05-10T20:00:00-05:00`): así pide schema.org las fechas de un evento. */
export function toLocalIso(instant: Date): string {
  const timestamp = instant.getTime();
  const { date, time } = toLocalInputs(instant);
  const seconds = String(localParts(timestamp).second).padStart(2, "0");
  const offsetMinutes = Math.round(localOffsetMs(timestamp) / 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
  return `${date}T${time}:${seconds}${sign}${hours}:${minutes}`;
}

/**
 * El día de hoy en Ecuador, fijado a mediodía UTC (igual que las fechas sin hora, como la de nacimiento): así `ageOn`
 * compara días de calendario de Ecuador y no cambia la edad a las 20:00/21:00, cuando en UTC ya es mañana.
 */
export function localToday(now: Date = new Date()): Date {
  return new Date(`${toLocalInputs(now).date}T12:00:00Z`);
}

/** `true` si es un día `YYYY-MM-DD` que existe en el calendario («2026-02-30» y «2026-13-01» no). Nunca lanza. */
export function isCalendarDay(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/** Suma días a una fecha `YYYY-MM-DD` (calendario, sin horas: el cambio de horario no la afecta). */
export function addDaysToDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}
