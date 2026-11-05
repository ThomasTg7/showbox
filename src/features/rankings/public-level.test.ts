import { describe, expect, it } from "vitest";
import { parseRankingLevel, rankingsHref } from "./public-level";

describe("parseRankingLevel", () => {
  it("reads amateur only when the param says so; anything else is pro", () => {
    expect(parseRankingLevel("amateur")).toBe("amateur");
    expect(parseRankingLevel("pro")).toBe("pro");
    expect(parseRankingLevel("Amateur")).toBe("pro");
    expect(parseRankingLevel(["amateur"])).toBe("pro");
    expect(parseRankingLevel(undefined)).toBe("pro");
  });
});

describe("rankingsHref", () => {
  it("gives each level its own URL (the amateur ranking is another page)", () => {
    expect(rankingsHref("pro")).toBe("/rankings");
    expect(rankingsHref("amateur")).toBe("/rankings?nivel=amateur");
  });
});
