import { expect, it } from "vitest";
import { fittedFontSize } from "./fit-text";

it("keeps the preferred font size when the longest word already fits", () => {
  expect(fittedFontSize(32, 240, 180, 12)).toBe(32);
});
it("fits a long word with a small safety margin", () => {
  expect(fittedFontSize(32, 102, 200, 12)).toBe(16);
});
it("preserves a readable minimum and never enlarges the original font", () => {
  expect(fittedFontSize(32, 30, 300, 12)).toBe(12);
  expect(fittedFontSize(10, 30, 300, 12)).toBe(10);
});
it("waits for measurable text instead of shrinking a hidden panel", () => {
  expect(fittedFontSize(32, 0, 200, 12)).toBe(32);
  expect(fittedFontSize(32, 200, 0, 12)).toBe(32);
});
