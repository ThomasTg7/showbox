import { inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { bouts, cardSegments, events, type TicketTier } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { eventWatchPlatforms } from "@/db/schema/event-watch-platforms";
import { DEFAULT_ROUND_SECONDS, DEFAULT_SCHEDULED_ROUNDS, type BoutLevel, type ScheduledRounds } from "@/domain/bout-enums";
import { validateBoutResult, type BoutResultInput } from "@/domain/bout-result";
import { slugify } from "@/domain/slug";
import { seedFighters } from "@/features/fighters/seed";
import { addDaysToDate, fromLocalInputs, toLocalInputs } from "@/lib/local-time";

const F = {
  cevallos: "bryan-cevallos",
  quinonez: "jordan-quinonez",
  andrango: "kevin-andrango",
  mina: "luis-mina",
  valencia: "carlos-valencia",
  tapia: "andres-tapia",
  caicedo: "mishel-caicedo",
  pazmino: "daniela-pazmino",
  huaman: "ruth-huaman",
  chala: "jefferson-chala",
  olivera: "martin-olivera",
  ortiz: "patricio-ortiz",
} as const;

type SeedBout = {
  red: string;
  blue: string;
  division?: string;
  catchweightKg?: number;
  level?: BoutLevel;
  rounds?: ScheduledRounds;
  /** Duración del round en segundos (por defecto 3 minutos; 2 en peleas femeninas). */
  roundSeconds?: number;
  title?: boolean;
  notes?: string;
  result?: BoutResultInput;
};
type SeedSegment = { name: string; time: string; bouts: SeedBout[] };
type SeedEvent = { number: number; weeksBefore: number; segments: SeedSegment[] };

const cards = (...scores: [number, number][]) => scores.map(([red, blue], index) => ({ judge: `Juez ${index + 1}`, red, blue }));
/** Tarjetas anotadas round por round (sistema de 10 puntos): el total es la suma. */
const roundCards = (...judges: [number, number][][]) =>
  judges.map((rounds, index) => ({
    judge: `Juez ${index + 1}`,
    red: rounds.reduce((sum, [red]) => sum + red, 0),
    blue: rounds.reduce((sum, [, blue]) => sum + blue, 0),
    rounds: rounds.map(([red, blue]) => ({ red, blue })),
  }));

const WOMEN_ROUND = 120;

// Cuatro veladas pasadas (todos los métodos de resultado del boxeo) y la próxima, sin resultados. Cada boxeador pelea una vez por velada.
const PAST_EVENTS: SeedEvent[] = [
  {
    number: 1,
    weeksBefore: 32,
    segments: [
      {
        name: "Cartelera estelar",
        time: "21:30",
        bouts: [
          { red: F.quinonez, blue: F.andrango, division: "peso-superligero", rounds: 8, result: { outcome: "red_win", method: "decision", decisionType: "unanimous", scorecards: roundCards([[10, 9], [10, 9], [9, 10], [10, 9], [10, 9], [10, 9], [9, 10], [10, 9]], [[10, 9], [9, 10], [10, 9], [10, 9], [10, 9], [9, 10], [10, 9], [10, 9]], [[10, 9], [10, 8], [10, 10], [10, 9], [9, 10], [10, 9], [10, 9], [10, 9]]), referee: "Ricardo Salazar" } },
          { red: F.mina, blue: F.valencia, division: "peso-welter", rounds: 8, result: { outcome: "red_win", method: "ko_tko", koTkoType: "tko_referee", endRound: 5, endTimeSeconds: 110 } },
        ],
      },
      {
        name: "Preliminares",
        time: "20:00",
        bouts: [
          { red: F.caicedo, blue: F.huaman, division: "peso-mosca-femenino", rounds: 6, roundSeconds: WOMEN_ROUND, result: { outcome: "red_win", method: "ko_tko", koTkoType: "rtd", endRound: 4, endTimeSeconds: WOMEN_ROUND } },
          { red: F.chala, blue: F.olivera, division: "peso-supergallo", rounds: 6, result: { outcome: "blue_win", method: "decision", decisionType: "split", scorecards: cards([58, 56], [56, 58], [55, 59]) } },
        ],
      },
    ],
  },
  {
    number: 2,
    weeksBefore: 24,
    segments: [
      {
        name: "Cartelera estelar",
        time: "21:30",
        bouts: [
          { red: F.andrango, blue: F.quinonez, division: "peso-superligero", rounds: 8, result: { outcome: "red_win", method: "decision", decisionType: "split", scorecards: cards([77, 75], [75, 77], [77, 75]) } },
          { red: F.valencia, blue: F.tapia, division: "peso-welter", rounds: 8, result: { outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: 3, endTimeSeconds: 161 } },
        ],
      },
      {
        name: "Preliminares",
        time: "20:00",
        bouts: [
          { red: F.pazmino, blue: F.huaman, division: "peso-mosca-femenino", level: "amateur", rounds: 3, roundSeconds: WOMEN_ROUND, result: { outcome: "draw", method: "decision", decisionType: "majority" } },
          { red: F.olivera, blue: F.chala, division: "peso-supergallo", rounds: 6, result: { outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: 1, endTimeSeconds: 52 } },
        ],
      },
    ],
  },
  {
    number: 3,
    weeksBefore: 16,
    segments: [
      {
        name: "Cartelera estelar",
        time: "21:30",
        bouts: [
          { red: F.andrango, blue: F.chala, catchweightKg: 60, rounds: 8, result: { outcome: "red_win", method: "ko_tko", koTkoType: "tko_doctor", endRound: 6, endTimeSeconds: 102 } },
          { red: F.mina, blue: F.tapia, division: "peso-welter", rounds: 8, result: { outcome: "red_win", method: "decision", decisionType: "majority", scorecards: cards([76, 76], [77, 75], [78, 74]) } },
        ],
      },
      {
        name: "Preliminares",
        time: "20:00",
        bouts: [
          { red: F.caicedo, blue: F.pazmino, division: "peso-mosca-femenino", rounds: 6, roundSeconds: WOMEN_ROUND, result: { outcome: "no_contest", method: "no_contest", ncReason: "accidental_foul", ncNote: "Choque de cabezas", endRound: 1, endTimeSeconds: 75 } },
          { red: F.olivera, blue: F.ortiz, division: "peso-supergallo", rounds: 6, notes: "Corte en la ceja de Ortiz por choque de cabezas.", result: { outcome: "red_win", method: "technical_decision", decisionType: "unanimous", endRound: 5, endTimeSeconds: 150 } },
        ],
      },
    ],
  },
  {
    number: 4,
    weeksBefore: 8,
    segments: [
      {
        name: "Cartelera estelar",
        time: "21:30",
        bouts: [
          { red: F.quinonez, blue: F.andrango, division: "peso-superligero", rounds: 10, result: { outcome: "red_win", method: "ko_tko", koTkoType: "ko", endRound: 7, endTimeSeconds: 123, bonuses: ["ko_of_night"] } },
          { red: F.valencia, blue: F.mina, division: "peso-welter", rounds: 10, result: { outcome: "red_win", method: "decision", decisionType: "unanimous", scorecards: cards([96, 94], [97, 93], [96, 94]), bonuses: ["fight_of_night"] } },
        ],
      },
      {
        name: "Preliminares",
        time: "20:00",
        bouts: [
          { red: F.caicedo, blue: F.pazmino, division: "peso-mosca-femenino", rounds: 8, roundSeconds: WOMEN_ROUND, result: { outcome: "red_win", method: "decision", decisionType: "split", bonuses: ["performance_of_night"] } },
          { red: F.chala, blue: F.ortiz, division: "peso-supergallo", rounds: 6, result: { outcome: "red_win", method: "disqualification", dqReason: "Golpes bajos reiterados", endRound: 4, endTimeSeconds: 58 } },
        ],
      },
    ],
  },
];

const UPCOMING_CARD: SeedSegment[] = [
  {
    name: "Cartelera estelar",
    time: "21:30",
    bouts: [
      { red: F.cevallos, blue: F.quinonez, division: "peso-superligero", title: true, rounds: 12 },
      { red: F.caicedo, blue: F.pazmino, division: "peso-mosca-femenino", title: true, rounds: 10, roundSeconds: WOMEN_ROUND },
      { red: F.valencia, blue: F.mina, division: "peso-welter", rounds: 10 },
    ],
  },
  {
    name: "Preliminares",
    time: "20:00",
    bouts: [
      { red: F.chala, blue: F.olivera, division: "peso-supergallo", rounds: 8 },
      { red: F.andrango, blue: F.tapia, catchweightKg: 65, rounds: 6 },
    ],
  },
];

// Precios en dólares (Ecuador): el campo se llama `priceClp` por herencia del esquema (ver docs/decisions.md).
const UPCOMING_TIERS: TicketTier[] = [
  { name: "General", description: "Graderío · Acceso 19:30", priceClp: 25, soldOut: false },
  { name: "Preferencial", description: "Silla numerada", priceClp: 45, soldOut: false },
  { name: "Ringside", description: "Primera fila · Meet & greet con los boxeadores", priceClp: 90, soldOut: false },
];

const VENUE = { venueName: "Quorum Paseo San Francisco", venueAddress: "Av. Interoceánica, Cumbayá", venueCity: "Quito", lat: -0.2004, lng: -78.4351 };

/** El sábado en o después de la fecha `YYYY-MM-DD`. */
function saturdayOnOrAfter(date: string): string {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDaysToDate(date, (6 - weekday + 7) % 7);
}

function instant(date: string, time: string): Date {
  const value = fromLocalInputs(date, time);
  if (!value) throw new Error(`Fecha inválida en el seed: ${date} ${time}`);
  return value;
}

type Lookups = { fighterId: Map<string, string>; divisionId: Map<string, string> };

async function loadLookups(db: Db): Promise<Lookups> {
  const [fighterRows, divisionRows] = await Promise.all([
    db.select({ id: fighters.id, slug: fighters.slug }).from(fighters).where(inArray(fighters.slug, Object.values(F))),
    db.select({ id: divisions.id, slug: divisions.slug }).from(divisions),
  ]);
  return {
    fighterId: new Map(fighterRows.map((row) => [row.slug, row.id])),
    divisionId: new Map(divisionRows.map((row) => [row.slug, row.id])),
  };
}

function lookup(map: Map<string, string>, key: string, what: string): string {
  const id = map.get(key);
  if (!id) throw new Error(`Falta ${what} «${key}» para el seed de eventos`);
  return id;
}

function boutValues(seed: SeedBout, ids: { eventId: string; segmentId: string; sortOrder: number }, lookups: Lookups): typeof bouts.$inferInsert {
  const rounds = seed.rounds ?? DEFAULT_SCHEDULED_ROUNDS;
  const roundSeconds = seed.roundSeconds ?? DEFAULT_ROUND_SECONDS;
  const base = {
    ...ids,
    redFighterId: lookup(lookups.fighterId, seed.red, "el boxeador"),
    blueFighterId: lookup(lookups.fighterId, seed.blue, "el boxeador"),
    divisionId: seed.division ? lookup(lookups.divisionId, seed.division, "la división") : null,
    catchweightKg: seed.catchweightKg ?? null,
    level: seed.level ?? "pro",
    scheduledRounds: rounds,
    roundSeconds,
    isTitleFight: seed.title ?? false,
  };
  if (!seed.result) return { ...base, notes: seed.notes ?? null };

  // El seed usa el mismo validador que el panel: un resultado inválido rompe el seed en vez de guardarse.
  const validated = validateBoutResult({ ...seed.result, notes: seed.notes }, { scheduledRounds: rounds, roundSeconds });
  if (!validated.ok) throw new Error(`Resultado inválido en el seed: ${JSON.stringify(validated.errors)}`);
  return { ...base, boutStatus: "completed", ...validated.value };
}

async function insertCard(db: Db, eventId: string, eventDate: string, segments: SeedSegment[], lookups: Lookups): Promise<void> {
  for (const [segmentIndex, segment] of segments.entries()) {
    const [created] = await db
      .insert(cardSegments)
      .values({ eventId, name: segment.name, sortOrder: segmentIndex, startsAt: instant(eventDate, segment.time) })
      .returning({ id: cardSegments.id });
    await db.insert(bouts).values(segment.bouts.map((bout, sortOrder) => boutValues(bout, { eventId, segmentId: created!.id, sortOrder }, lookups)));
  }
}

/**
 * Cinco veladas: ShowBox Fight Night 1–4 finalizadas con resultados de todo tipo y la 5 programada (sábado 21:00, 3 a 4 semanas
 * después de `now`, sin resultados). Las fechas son relativas a `now`: el demo nunca queda vencido. Idempotente.
 */
export async function seedEvents(db: Db, now: Date = new Date()): Promise<void> {
  await seedFighters(db);
  const lookups = await loadLookups(db);

  const upcomingDate = saturdayOnOrAfter(addDaysToDate(toLocalInputs(now).date, 21));
  const definitions = [
    ...PAST_EVENTS.map((event) => ({ ...event, date: addDaysToDate(upcomingDate, -7 * event.weeksBefore), past: true })),
    { number: 5, weeksBefore: 0, segments: UPCOMING_CARD, date: upcomingDate, past: false },
  ];

  for (const definition of definitions) {
    const name = `ShowBox Fight Night ${definition.number}`;
    const [created] = await db
      .insert(events)
      .values({
        slug: slugify(name),
        name,
        number: definition.number,
        startsAt: instant(definition.date, "21:00"),
        ...VENUE,
        ...(definition.past
          ? { eventStatus: "completed" as const }
          : {
              doorsAt: instant(definition.date, "19:30"),
              endsEstimatedAt: instant(addDaysToDate(definition.date, 1), "00:30"),
              ticketUrl: "https://www.example.com/entradas/showbox-fight-night-5",
              ticketProvider: "Ticketera de ejemplo",
              ticketTiers: UPCOMING_TIERS,
              ticketPoints: "Boletería del recinto (lunes a sábado, 11:00 a 19:00) y puntos de venta autorizados de ShowBox Promotions.",
            }),
        status: "published" as const,
      })
      .onConflictDoNothing({ target: events.slug })
      .returning({ id: events.id });

    // Un evento que ya existía conserva su cartelera tal como está.
    if (created) {
      await insertCard(db, created.id, definition.date, definition.segments, lookups);
      await db.insert(eventWatchPlatforms).values({ eventId: created.id, name: "YouTube · ShowBox Promotions", url: "https://www.youtube.com/@ShowBoxPromotionsEC", sortOrder: 0 });
    }
  }
}
