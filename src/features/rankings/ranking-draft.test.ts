import { describe, expect, it } from "vitest";
import type { EditorFighter } from "./dto";
import { addToDraft, applySuggestionToDraft, isDraftDirty } from "./ranking-draft";
import type { SuggestionItem } from "./suggestions";

const fighter = (id: string, hiddenNote: string | null = null): EditorFighter => ({ id, name: `Boxeador ${id}`, nationality: "CL", hiddenNote });

const suggestion = (overrides: Partial<SuggestionItem> & Pick<SuggestionItem, "fighterId" | "kind" | "toPosition">): SuggestionItem => ({
  reason: "",
  fighterName: `Boxeador ${overrides.fighterId}`,
  fighterNationality: "CL",
  eventId: "e1",
  eventName: "ShowBox Fight Night 5",
  scopeKey: "pro:d1",
  ...overrides,
});

describe("applySuggestionToDraft", () => {
  it("moves a ranked fighter to the suggested position", () => {
    const draft = [fighter("a"), fighter("b"), fighter("c")];
    expect(applySuggestionToDraft(draft, suggestion({ kind: "move", fighterId: "c", toPosition: 1 }), 5).map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("brings in a newcomer with the name the suggestion carries and drops whoever falls out of the slots", () => {
    const draft = [fighter("a"), fighter("b"), fighter("c")];
    const next = applySuggestionToDraft(draft, suggestion({ kind: "enter", fighterId: "n", toPosition: 2 }), 3);
    expect(next.map((item) => [item.id, item.name])).toEqual([
      ["a", "Boxeador a"],
      ["n", "Boxeador n"],
      ["b", "Boxeador b"],
    ]);
  });
});

describe("addToDraft", () => {
  it("adds at the end, once, and never beyond the slots", () => {
    expect(addToDraft([fighter("a")], fighter("b"), 2).map((item) => item.id)).toEqual(["a", "b"]);
    expect(addToDraft([fighter("a")], fighter("a"), 2).map((item) => item.id)).toEqual(["a"]);
    expect(addToDraft([fighter("a"), fighter("b")], fighter("c"), 2).map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("isDraftDirty", () => {
  it("compares the order of ids with what was saved", () => {
    const saved = [fighter("a"), fighter("b")];
    expect(isDraftDirty(saved, [fighter("a"), fighter("b")])).toBe(false);
    expect(isDraftDirty(saved, [fighter("b"), fighter("a")])).toBe(true);
    expect(isDraftDirty(saved, [fighter("a")])).toBe(true);
  });
});
