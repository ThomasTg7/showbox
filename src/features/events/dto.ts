import type { TicketTier } from "@/db/schema/events";
import type { BoutLevel, BoutStatus, Bonus, EventStatus, Method, Outcome } from "@/domain/bout-enums";
import type { ManualRecord } from "@/features/fighters/dto";
import type { MediaDTO } from "@/features/media/dto";
import type { Scorecard } from "@/domain/bout-result";

// Todo lo que pasa por `unstable_cache` se serializa en JSON: las fechas viajan como texto ISO, nunca como `Date`.

export type BoutFighterDTO = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  nationality: string;
  /** Solo el boxeador público tiene ficha: los demás salen sin enlace. */
  isPublic: boolean;
  /** Récord cargado a mano del nivel de la pelea (profesional o amateur). */
  record: ManualRecord;
  /** Estatura, peso y alcance para la comparación de la cartelera; `null` si la ficha no los tiene. */
  heightCm: number | null;
  weightKg: number | null;
  reachCm: number | null;
  headshotMedia: MediaDTO | null;
  /** Foto de cuerpo entero: el careo del hero y la tarjeta de cada pelea (en los listados, solo la estelar). */
  bodyMedia: MediaDTO | null;
};

export type BoutResultDTO = {
  outcome: Outcome;
  method: Method;
  endRound: number;
  endTimeSeconds: number;
  /** "Pérez vence a Soto · KO · R2 2:42" (con apellidos). */
  line: string;
  /** "TKO (detención del árbitro)": el método sin ganador ni tiempo. */
  methodText: string;
  referee: string | null;
  /** Tarjetas de los jueces (solo en decisiones, si se anotaron); con `rounds` si se anotaron round por round. */
  scorecards: Scorecard[] | null;
  bonuses: Bonus[];
  videoUrl: string | null;
};

export type BoutDTO = {
  id: string;
  level: BoutLevel;
  scheduledRounds: number;
  roundSeconds: number;
  isTitleFight: boolean;
  status: BoutStatus;
  cancelReason: string | null;
  division: { name: string; slug: string; gender: "male" | "female" } | null;
  /** Peso pactado: si existe, se muestra en lugar de la división. */
  catchweightKg: number | null;
  red: BoutFighterDTO;
  blue: BoutFighterDTO;
  result: BoutResultDTO | null;
};

export type SegmentDTO = { id: string; name: string; startsAt: string | null; bouts: BoutDTO[] };

export type EventVenueDTO = { name: string; address: string; city: string; lat: number | null; lng: number | null };
export type WatchPlatformDTO = { name: string; url: string; media: MediaDTO | null };

/** Lo que necesitan los listados, la home y la página de entradas. */
export type EventCardDTO = {
  id: string;
  slug: string;
  name: string;
  number: number | null;
  startsAt: string;
  /** Fin estimado (o `null`): hasta ahí el evento se ve «en vivo» solo (`effectiveEventStatus`). */
  endsEstimatedAt: string | null;
  venueName: string;
  venueCity: string;
  eventStatus: EventStatus;
  ticketUrl: string | null;
  ticketTiers: TicketTier[];
  ticketPoints: string | null;
  watchPlatforms?: WatchPlatformDTO[];
  heroMedia: MediaDTO | null;
  heroMobileMedia: MediaDTO | null;
  posterMedia: MediaDTO | null;
  /** La pelea estelar (primera del primer bloque); `null` si la cartelera aún no tiene peleas. */
  mainBout: BoutDTO | null;
};

export type EventPageDTO = Omit<EventCardDTO, "mainBout" | "venueName" | "venueCity"> & {
  doorsAt: string | null;
  venue: EventVenueDTO;
  ticketProvider: string | null;
  streamUrl: string | null;
  gallery: MediaDTO[];
  segments: SegmentDTO[];
};

export type AdminEventRow = {
  id: string;
  slug: string;
  name: string;
  number: number | null;
  startsAt: Date;
  venueCity: string;
  eventStatus: EventStatus;
  status: "draft" | "scheduled" | "published";
  publishAt: Date | null;
  updatedAt: Date;
  boutCount: number;
  posterMedia: MediaDTO | null;
};

// Lado del boxeador (ficha): historial y próxima pelea.

export type OpponentDTO = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nationality: string;
  isPublic: boolean;
  /** Las dos fotos: la miniatura prefiere el rostro y, sin él, usa la de cuerpo. */
  headshotMedia: MediaDTO | null;
  bodyMedia: MediaDTO | null;
};

export type FightHistoryRow = {
  boutId: string;
  level: BoutLevel;
  fighterResult: "win" | "loss" | "draw" | "no_contest";
  methodText: string;
  /** «R2 3:42», o `null` en una decisión (llegó al final). */
  roundTime: string | null;
  date: string;
  eventId: string;
  eventSlug: string;
  eventName: string;
  opponent: OpponentDTO;
};

export type NextBoutDTO = {
  boutId: string;
  isTitleFight: boolean;
  scheduledRounds: number;
  roundSeconds: number;
  divisionName: string | null;
  divisionGender: "male" | "female" | null;
  catchweightKg: number | null;
  event: { id: string; slug: string; name: string; startsAt: string; venueCity: string };
  opponent: OpponentDTO;
};
