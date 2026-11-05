import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "./search";

describe("normalizeSearchText", () => {
  it("lowercases, removes accents and collapses spaces", () => {
    expect(normalizeSearchText("  Matías  PÉREZ ")).toBe("matias perez");
    expect(normalizeSearchText("Ñuñoa")).toBe("nunoa");
  });
});
