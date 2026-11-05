import { describe, expect, it } from "vitest";
import { ageOn, cmToFeetInches, countryName, formatHeight, formatWeight, kgToLb } from "./units";

describe("units", () => {
  it("converts kg to whole pounds", () => {
    expect(kgToLb(70.3)).toBe(155);
    expect(kgToLb(56.7)).toBe(125);
  });

  it("converts cm to feet and inches", () => {
    expect(cmToFeetInches(180)).toBe("5'11\"");
    expect(cmToFeetInches(152.4)).toBe("5'0\"");
  });

  it("formats weight and height with both units", () => {
    expect(formatWeight(70.3)).toBe("70.3 kg / 155 lb");
    expect(formatWeight(93)).toBe("93.0 kg / 205 lb");
    expect(formatHeight(180)).toBe("180 cm / 5'11\"");
  });

  it("computes age, treating a 29 February birthday as 1 March in non-leap years", () => {
    const birth = new Date("2000-02-29");
    expect(ageOn(birth, new Date("2025-02-28"))).toBe(24);
    expect(ageOn(birth, new Date("2025-03-01"))).toBe(25);
    expect(ageOn(birth, new Date("2024-02-29"))).toBe(24);
  });

  it("computes age around an ordinary birthday", () => {
    const birth = new Date("1995-06-15");
    expect(ageOn(birth, new Date("2025-06-14"))).toBe(29);
    expect(ageOn(birth, new Date("2025-06-15"))).toBe(30);
  });

  it("names countries in Spanish", () => {
    expect(countryName("CL")).toBe("Chile");
    expect(countryName("AR")).toBe("Argentina");
    expect(countryName("BR")).toBe("Brasil");
  });
});
