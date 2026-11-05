import { describe, expect, it } from "vitest";
import { parsePageParam } from "./pagination";

describe("parsePageParam", () => {
  it("reads a positive page number", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  it("defaults to page 1 for missing, invalid or out-of-range values", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("2.5")).toBe(1);
    expect(parsePageParam(["2", "3"])).toBe(1);
  });
});
