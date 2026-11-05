import { describe, expect, it } from "vitest";
import { splitNightBouts, type NightSegment } from "./night-order";

const segment = (name: string, bouts: { id: string; status: "scheduled" | "completed" | "cancelled" }[]): NightSegment<{ id: string; status: "scheduled" | "completed" | "cancelled" }> => ({ name, bouts });

// La cartelera está en orden de importancia (la estelar primero); la noche se pelea al revés.
const card = () => [
  segment("Cartelera estelar", [
    { id: "E0", status: "scheduled" },
    { id: "E1", status: "scheduled" },
  ]),
  segment("Preliminares", [
    { id: "P0", status: "scheduled" },
    { id: "P1", status: "scheduled" },
  ]),
];

describe("splitNightBouts", () => {
  it("orders the night from the last fight of the last block to the main event", () => {
    const { pending } = splitNightBouts(card());
    expect(pending.map((item) => item.id)).toEqual(["P1", "P0", "E1", "E0"]);
  });

  it("remembers the block of each fight", () => {
    const { pending } = splitNightBouts(card());
    expect(pending.map((item) => item.segmentName)).toEqual(["Preliminares", "Preliminares", "Cartelera estelar", "Cartelera estelar"]);
  });

  it("separates the finished and the cancelled fights from the pending ones", () => {
    const segments = card();
    segments[1]!.bouts[1] = { id: "P1", status: "completed" };
    segments[0]!.bouts[0] = { id: "E0", status: "cancelled" };
    const { pending, finished, cancelled } = splitNightBouts(segments);
    expect(pending.map((item) => item.id)).toEqual(["P0", "E1"]);
    expect(finished.map((item) => item.id)).toEqual(["P1"]);
    expect(cancelled.map((item) => item.id)).toEqual(["E0"]);
  });

  it("lists the finished fights with the most recent first (the last one fought is on top)", () => {
    const segments = card();
    for (const item of segments.flatMap((entry) => entry.bouts)) item.status = "completed";
    expect(splitNightBouts(segments).finished.map((item) => item.id)).toEqual(["E0", "E1", "P0", "P1"]);
  });

  it("copes with a card without blocks or fights", () => {
    expect(splitNightBouts([])).toEqual({ pending: [], finished: [], cancelled: [] });
    expect(splitNightBouts([segment("Vacío", [])]).pending).toEqual([]);
  });
});
