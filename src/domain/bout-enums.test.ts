import { describe, expect, it } from "vitest";
import { selectableNcReasons } from "./bout-enums";

describe("selectableNcReasons", () => {
  it("leaves «Resultado anulado» out unless the fight already has it", () => {
    expect(selectableNcReasons("")).toEqual(["accidental_foul", "other"]);
    expect(selectableNcReasons("other")).toEqual(["accidental_foul", "other"]);
    expect(selectableNcReasons("overturned")).toEqual(["accidental_foul", "overturned", "other"]);
  });
});
