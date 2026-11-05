import { describe, expect, it } from "vitest";
import { boutBillingLabel, boutMeasure, countdownParts, eventStatusTag, fighterComparison, mapEmbedUrl, mapLinkUrl, roundsLabel, scorecardsLine, sellsTickets, showsCountdown, youtubeEmbedUrl } from "./public-format";

describe("boutMeasure", () => {
  it("writes the division like the rest of the site", () => {
    expect(boutMeasure({ catchweightKg: null, division: { name: "Ligero", gender: "male" } })).toBe("Peso Ligero");
    expect(boutMeasure({ catchweightKg: null, division: { name: "Paja", gender: "female" } })).toBe("Peso Paja fem.");
  });

  it("prefers an agreed catch weight", () => {
    expect(boutMeasure({ catchweightKg: 72.5, division: null })).toBe("Peso pactado 72.5 kg");
    expect(boutMeasure({ catchweightKg: 73, division: { name: "Ligero", gender: "male" } })).toBe("Peso pactado 73.0 kg");
  });

  it("is empty without division or weight", () => {
    expect(boutMeasure({ catchweightKg: null, division: null })).toBe("");
  });
});

describe("boutBillingLabel", () => {
  const base = { catchweightKg: null, division: { name: "Ligero", gender: "male" as const }, isTitleFight: false, level: "pro" as const };

  it("names the weight class", () => {
    expect(boutBillingLabel(base)).toBe("Peso Ligero");
  });

  it("announces a title fight before the weight class", () => {
    expect(boutBillingLabel({ ...base, isTitleFight: true })).toBe("Pelea por el título – Peso Ligero");
  });

  it("marks an amateur bout", () => {
    expect(boutBillingLabel({ ...base, level: "amateur" })).toBe("Peso Ligero · Amateur");
  });

  it("still says it is a title fight without a weight class", () => {
    expect(boutBillingLabel({ ...base, division: null, isTitleFight: true })).toBe("Pelea por el título");
    expect(boutBillingLabel({ ...base, division: null })).toBe("");
    expect(boutBillingLabel({ ...base, division: null, level: "amateur" })).toBe("Amateur");
  });
});

describe("roundsLabel", () => {
  it("writes rounds × minutes", () => {
    expect(roundsLabel({ scheduledRounds: 5, roundSeconds: 300 })).toBe("5 × 5 MIN");
    expect(roundsLabel({ scheduledRounds: 3, roundSeconds: 180 })).toBe("3 × 3 MIN");
  });

  it("keeps the seconds of a round that is not a whole number of minutes", () => {
    expect(roundsLabel({ scheduledRounds: 3, roundSeconds: 90 })).toBe("3 × 1:30 MIN");
  });
});

describe("countdownParts", () => {
  it("splits the time left into days, hours, minutes and seconds", () => {
    expect(countdownParts(((1 * 24 + 2) * 60 + 3) * 60 * 1000 + 4000)).toEqual({ days: 1, hours: 2, minutes: 3, seconds: 4 });
    expect(countdownParts(59_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 59 });
  });

  it("is null once the time is up", () => {
    expect(countdownParts(0)).toBeNull();
    expect(countdownParts(-1)).toBeNull();
  });
});

describe("youtubeEmbedUrl", () => {
  it("turns the usual YouTube links into a privacy-friendly embed", () => {
    const embed = "https://www.youtube-nocookie.com/embed/abc123XYZ_-";
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=abc123XYZ_-")).toBe(embed);
    expect(youtubeEmbedUrl("https://youtu.be/abc123XYZ_-?t=5")).toBe(embed);
    expect(youtubeEmbedUrl("https://www.youtube.com/live/abc123XYZ_-")).toBe(embed);
    expect(youtubeEmbedUrl("https://m.youtube.com/watch?v=abc123XYZ_-&feature=share")).toBe(embed);
  });

  it("does not embed anything else", () => {
    expect(youtubeEmbedUrl("https://vimeo.com/123")).toBeNull();
    expect(youtubeEmbedUrl("https://www.youtube.com/@showboxpromotions")).toBeNull();
    expect(youtubeEmbedUrl("https://evil.example.com/watch?v=abc123")).toBeNull();
    expect(youtubeEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(youtubeEmbedUrl("no es un enlace")).toBeNull();
  });
});

describe("map links", () => {
  it("builds a Google Maps embed around the point, and a link to open it", () => {
    expect(mapEmbedUrl(-33.4489, -70.6693)).toBe("https://www.google.com/maps?q=-33.4489%2C-70.6693&z=16&output=embed");
    expect(mapLinkUrl(-33.4489, -70.6693)).toBe("https://www.google.com/maps/search/?api=1&query=-33.4489%2C-70.6693");
  });
});

describe("eventStatusTag", () => {
  it("names each state the way the public reads it: upcoming, live, finished", () => {
    expect(eventStatusTag("scheduled")).toEqual({ tone: "brand", label: "Próximo" });
    expect(eventStatusTag("live")).toEqual({ tone: "red", label: "● En vivo" });
    expect(eventStatusTag("completed")).toEqual({ tone: "outline", label: "Finalizado" });
    expect(eventStatusTag("cancelled")).toEqual({ tone: "red", label: "Cancelado" });
  });
});

describe("fighterComparison", () => {
  const fighter = (overrides: Partial<Parameters<typeof fighterComparison>[0]> = {}) => ({
    nationality: "CL",
    record: { wins: 12, losses: 2, draws: 0, noContests: 0 },
    heightCm: 180,
    weightKg: 70.3,
    reachCm: 184,
    ...overrides,
  });

  it("lists record, country, height, weight and reach side by side, in that order", () => {
    const rows = fighterComparison(fighter(), fighter({ nationality: "AR", record: { wins: 10, losses: 1, draws: 0, noContests: 0 }, heightCm: 178, weightKg: 70, reachCm: 181 }));
    expect(rows.map((row) => row.label)).toEqual(["Récord", "País", "Altura", "Peso", "Alcance"]);
    expect(rows[0]).toMatchObject({ red: "12-2-0", blue: "10-1-0" });
    expect(rows[1]).toMatchObject({ red: "Chile", blue: "Argentina" });
    expect(rows[2]).toMatchObject({ red: "180 cm", blue: "178 cm" });
    expect(rows[3]).toMatchObject({ red: "70.3 kg", blue: "70 kg" });
    expect(rows[4]).toMatchObject({ red: "184 cm", blue: "181 cm" });
  });

  it("leaves out a measure when either fighter does not have it", () => {
    const rows = fighterComparison(fighter({ reachCm: null }), fighter({ heightCm: null }));
    expect(rows.map((row) => row.label)).toEqual(["Récord", "País", "Peso"]);
  });

  it("keeps the record even when it is 0-0-0", () => {
    const empty = { wins: 0, losses: 0, draws: 0, noContests: 0 };
    expect(fighterComparison(fighter({ record: empty }), fighter({ record: empty }))[0]).toMatchObject({ red: "0-0-0", blue: "0-0-0" });
  });
});

describe("showsCountdown", () => {
  const now = Date.parse("2026-10-23T00:00:00Z");

  it("shows the clock for a scheduled event that has not started, and for one that is live", () => {
    expect(showsCountdown({ eventStatus: "scheduled", startsAt: "2026-10-24T00:00:00Z" }, now)).toBe(true);
    expect(showsCountdown({ eventStatus: "live", startsAt: "2026-10-22T20:00:00Z" }, now)).toBe(true);
  });

  it("does not for finished or cancelled events, nor for a scheduled event whose time already passed", () => {
    expect(showsCountdown({ eventStatus: "completed", startsAt: "2026-10-24T00:00:00Z" }, now)).toBe(false);
    expect(showsCountdown({ eventStatus: "cancelled", startsAt: "2026-10-24T00:00:00Z" }, now)).toBe(false);
    expect(showsCountdown({ eventStatus: "scheduled", startsAt: "2026-10-22T00:00:00Z" }, now)).toBe(false);
  });
});

describe("sellsTickets", () => {
  const now = Date.parse("2026-10-25T12:00:00Z");

  it("sells for a scheduled event still ahead or started less than 12 hours ago, and for a live one", () => {
    expect(sellsTickets({ eventStatus: "scheduled", startsAt: "2026-10-31T00:00:00Z" }, now)).toBe(true);
    expect(sellsTickets({ eventStatus: "scheduled", startsAt: "2026-10-25T01:00:00Z" }, now)).toBe(true);
    expect(sellsTickets({ eventStatus: "live", startsAt: "2026-10-20T00:00:00Z" }, now)).toBe(true);
  });

  it("does not sell for a past event that nobody closed, nor for a finished or cancelled one", () => {
    expect(sellsTickets({ eventStatus: "scheduled", startsAt: "2026-10-24T23:00:00Z" }, now)).toBe(false);
    expect(sellsTickets({ eventStatus: "completed", startsAt: "2026-10-31T00:00:00Z" }, now)).toBe(false);
    expect(sellsTickets({ eventStatus: "cancelled", startsAt: "2026-10-31T00:00:00Z" }, now)).toBe(false);
  });
});

describe("scorecardsLine", () => {
  const cards = [
    { red: 29, blue: 28 },
    { red: 28, blue: 29 },
    { red: 30, blue: 27 },
  ];

  it("puts the winner's score first, like the announcer", () => {
    expect(scorecardsLine(cards, "red_win")).toBe("29-28 · 28-29 · 30-27");
    expect(scorecardsLine(cards, "blue_win")).toBe("28-29 · 29-28 · 27-30");
  });

  it("puts the higher score first in a draw", () => {
    expect(scorecardsLine([{ red: 28, blue: 29 }, { red: 28, blue: 28 }], "draw")).toBe("29-28 · 28-28");
  });
});
