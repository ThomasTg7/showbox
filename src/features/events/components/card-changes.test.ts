import { describe, expect, it } from "vitest";
import type { AdminBout, AdminSegment } from "../admin-card-queries";
import { applyChange, resolveDrop } from "./card-changes";

function bout(id: string, segmentId: string): AdminBout {
  const fighter = { id: `${id}-f`, firstName: id, lastName: id, nickname: null, nationality: "CL", headshotMedia: null, bodyMedia: null };
  return {
    id,
    segmentId,
    level: "pro",
    scheduledRounds: 3,
    roundSeconds: 300,
    isTitleFight: false,
    championCorner: "red",
    status: "scheduled",
    cancelReason: null,
    divisionId: null,
    divisionName: null,
    divisionGender: null,
    catchweightKg: 70,
    red: fighter,
    blue: fighter,
    result: null,
    resultLine: null,
  };
}

const segment = (id: string, boutIds: string[]): AdminSegment => ({ id, name: id, startsTime: "", bouts: boutIds.map((boutId) => bout(boutId, id)) });
const ids = (segments: AdminSegment[]) => segments.map((entry) => entry.bouts.map((item) => item.id));

const card = () => [segment("S1", ["A", "B", "C"]), segment("S2", ["X", "Y"]), segment("S3", [])];

describe("applyChange", () => {
  it("moves a fight down and up inside a block, as the server does", () => {
    expect(ids(applyChange(card(), { type: "move", boutId: "A", segmentId: "S1", index: 2 }))[0]).toEqual(["B", "C", "A"]);
    expect(ids(applyChange(card(), { type: "move", boutId: "C", segmentId: "S1", index: 0 }))[0]).toEqual(["C", "A", "B"]);
  });

  it("moves a fight to another block at a position, leaving the source without it", () => {
    const moved = applyChange(card(), { type: "move", boutId: "B", segmentId: "S2", index: 1 });
    expect(ids(moved)).toEqual([["A", "C"], ["X", "B", "Y"], []]);
    expect(moved[1]!.bouts[1]!.segmentId).toBe("S2");
  });

  it("puts a fight in an empty block and clamps a position past the end", () => {
    expect(ids(applyChange(card(), { type: "move", boutId: "X", segmentId: "S3", index: 0 }))).toEqual([["A", "B", "C"], ["Y"], ["X"]]);
    expect(ids(applyChange(card(), { type: "move", boutId: "A", segmentId: "S2", index: 99 }))[1]).toEqual(["X", "Y", "A"]);
  });

  it("ignores a fight or a block that does not exist", () => {
    expect(ids(applyChange(card(), { type: "move", boutId: "?", segmentId: "S1", index: 0 }))).toEqual(ids(card()));
    expect(ids(applyChange(card(), { type: "move", boutId: "A", segmentId: "??", index: 0 }))).toEqual(ids(card()));
  });

  it("reorders the blocks", () => {
    expect(applyChange(card(), { type: "segments", ids: ["S3", "S1", "S2"] }).map((entry) => entry.id)).toEqual(["S3", "S1", "S2"]);
  });
});

describe("resolveDrop", () => {
  it("drops onto a fight of the same block: the fight takes that fight's place", () => {
    expect(resolveDrop(card(), "A", "C", true)).toEqual({ segmentId: "S1", index: 2 });
    expect(resolveDrop(card(), "C", "A", false)).toEqual({ segmentId: "S1", index: 0 });
  });

  it("drops onto a fight of another block: before it, or after it when dragged below its center", () => {
    expect(resolveDrop(card(), "A", "X", false)).toEqual({ segmentId: "S2", index: 0 });
    expect(resolveDrop(card(), "A", "Y", true)).toEqual({ segmentId: "S2", index: 2 });
  });

  it("drops onto a block itself: at the end (an empty block gets index 0)", () => {
    expect(resolveDrop(card(), "A", "segment:S2", false)).toEqual({ segmentId: "S2", index: 2 });
    expect(resolveDrop(card(), "A", "segment:S3", false)).toEqual({ segmentId: "S3", index: 0 });
    expect(resolveDrop(card(), "A", "segment:S1", false)).toEqual({ segmentId: "S1", index: 2 });
  });

  it("does nothing when the fight lands where it already is, or on something unknown", () => {
    expect(resolveDrop(card(), "A", "A", false)).toBeNull();
    expect(resolveDrop(card(), "C", "segment:S1", false)).toBeNull();
    expect(resolveDrop(card(), "?", "B", false)).toBeNull();
    expect(resolveDrop(card(), "A", "nope", false)).toBeNull();
  });
});
