import { formatClock } from "@/domain/clock";
import { isWithinUpcomingGrace } from "@/domain/event-night";
import { countryName } from "@/domain/units";
import type { ManualRecord } from "@/features/fighters/dto";
import { divisionTitle } from "@/features/fighters/labels";

// Textos y enlaces de la página pública del evento, sin React: se testean solos.

/** «Peso Ligero», «Peso Paja fem.» o «Peso pactado 72.5 kg» (el peso pactado manda sobre la división). Vacío si no hay ninguno. */
export function boutMeasure(bout: { catchweightKg: number | null; division: { name: string; gender: "male" | "female" } | null }): string {
  if (bout.catchweightKg !== null) return `Peso pactado ${bout.catchweightKg.toFixed(1)} kg`;
  return bout.division ? divisionTitle(bout.division) : "";
}

/** Lo que anuncia la franja de la pelea en la cartelera: «Peso Ligero», «Pelea por el título – Peso Ligero», «… · Amateur». */
export function boutBillingLabel(bout: Parameters<typeof boutMeasure>[0] & { isTitleFight: boolean; level: "pro" | "amateur" }): string {
  const parts = [bout.isTitleFight ? "Pelea por el título" : "", boutMeasure(bout)].filter(Boolean);
  const label = parts.join(" – ");
  if (bout.level !== "amateur") return label;
  return label ? `${label} · Amateur` : "Amateur";
}

/** «5 × 5 MIN». Un round que no dura minutos exactos conserva los segundos: «3 × 1:30 MIN». */
export function roundsLabel(bout: { scheduledRounds: number; roundSeconds: number }): string {
  const length = bout.roundSeconds % 60 === 0 ? String(bout.roundSeconds / 60) : formatClock(bout.roundSeconds);
  return `${bout.scheduledRounds} × ${length} MIN`;
}

/** Lo que falta hasta la hora del evento; `null` cuando ya llegó. */
export function countdownParts(remainingMs: number): { days: number; hours: number; minutes: number; seconds: number } | null {
  if (remainingMs <= 0) return null;
  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** El enlace de YouTube (watch, live o youtu.be) como URL de inserción sin cookies; `null` para cualquier otro enlace. */
export function youtubeEmbedUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !YOUTUBE_HOSTS.has(url.hostname)) return null;

  const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.pathname.startsWith("/live/") ? url.pathname.slice("/live/".length) : url.pathname === "/watch" ? url.searchParams.get("v") : null;
  return id && YOUTUBE_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/** Mapa de Google Maps centrado en el recinto (la inserción por coordenadas no pide clave de API). */
export function mapEmbedUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?${new URLSearchParams({ q: `${lat},${lng}`, z: "16", output: "embed" }).toString()}`;
}

/** Enlace para abrir el recinto en Google Maps (la aplicación en el celular). */
export function mapLinkUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: `${lat},${lng}` }).toString()}`;
}

/** Si la página muestra la cuenta regresiva: un evento programado que aún no empieza, o uno en vivo (dirá «EN VIVO»). */
export function showsCountdown(event: { eventStatus: "scheduled" | "live" | "completed" | "cancelled"; startsAt: string }, nowMs: number = Date.now()): boolean {
  if (event.eventStatus === "live") return true;
  return event.eventStatus === "scheduled" && new Date(event.startsAt).getTime() > nowMs;
}

type EventStatus = "scheduled" | "live" | "completed" | "cancelled";

/**
 * Si la página del evento vende entradas: en vivo, o programado y todavía «próximo» (sin empezar o empezado hace menos de
 * 12 h). Un evento pasado que nadie cerró en el panel ya no vende.
 */
export function sellsTickets(event: { eventStatus: EventStatus; startsAt: string }, nowMs: number = Date.now()): boolean {
  if (event.eventStatus === "live") return true;
  return event.eventStatus === "scheduled" && isWithinUpcomingGrace(new Date(event.startsAt), new Date(nowMs));
}

/** La etiqueta del estado en la portada del evento: lo único que se dice del evento además de su nombre. */
export function eventStatusTag(status: EventStatus): { tone: "brand" | "red" | "outline"; label: string } {
  switch (status) {
    case "scheduled":
      return { tone: "brand", label: "Próximo" };
    case "live":
      return { tone: "red", label: "● En vivo" };
    case "completed":
      return { tone: "outline", label: "Finalizado" };
    case "cancelled":
      return { tone: "red", label: "Cancelado" };
  }
}

type Comparable = { nationality: string; record: ManualRecord; heightCm: number | null; weightKg: number | null; reachCm: number | null };

/**
 * Las filas de «frente a frente» de una pelea: récord, país, altura, peso y alcance de cada esquina. Una medida que le
 * falta a cualquiera de los dos no se muestra (comparar con un hueco no dice nada). El récord y el país siempre hay.
 */
export function fighterComparison(red: Comparable, blue: Comparable): { label: string; red: string; blue: string }[] {
  const record = ({ wins, losses, draws }: ManualRecord) => `${wins}-${losses}-${draws}`;
  const rows = [
    { label: "Récord", red: record(red.record), blue: record(blue.record) },
    { label: "País", red: countryName(red.nationality), blue: countryName(blue.nationality) },
  ];
  const measures = [
    { label: "Altura", red: red.heightCm, blue: blue.heightCm, unit: "cm" },
    { label: "Peso", red: red.weightKg, blue: blue.weightKg, unit: "kg" },
    { label: "Alcance", red: red.reachCm, blue: blue.reachCm, unit: "cm" },
  ];
  for (const { label, red: redValue, blue: blueValue, unit } of measures) {
    if (typeof redValue === "number" && typeof blueValue === "number") rows.push({ label, red: `${redValue} ${unit}`, blue: `${blueValue} ${unit}` });
  }
  return rows;
}

/**
 * Los puntajes de las tarjetas como se anuncian: «29-28 · 29-28 · 30-27», con el puntaje del ganador primero (en un empate
 * o sin resultado, el más alto primero).
 */
export function scorecardsLine(scorecards: { red: number; blue: number }[], outcome: "red_win" | "blue_win" | "draw" | "no_contest"): string {
  return scorecards
    .map(({ red, blue }) => {
      if (outcome === "red_win") return `${red}-${blue}`;
      if (outcome === "blue_win") return `${blue}-${red}`;
      return `${Math.max(red, blue)}-${Math.min(red, blue)}`;
    })
    .join(" · ");
}
