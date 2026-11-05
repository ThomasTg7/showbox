import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("removes accents, quotes and extra spaces", () => {
    expect(slugify('Matías "El Toro" Pérez')).toBe("matias-el-toro-perez");
    expect(slugify("  Ñuñoa  ")).toBe("nunoa");
  });

  it("collapses symbols into single hyphens", () => {
    expect(slugify("Peso -- Pluma / 65.8")).toBe("peso-pluma-65-8");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("¡¿?!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  const taken = (used: string[]) => async (slug: string) => used.includes(slug);

  it("returns the base when it is free", async () => {
    expect(await uniqueSlug("matias-perez", taken([]))).toBe("matias-perez");
  });

  it("appends the first free numeric suffix starting at 2", async () => {
    expect(await uniqueSlug("matias-perez", taken(["matias-perez"]))).toBe("matias-perez-2");
    expect(await uniqueSlug("matias-perez", taken(["matias-perez", "matias-perez-2"]))).toBe("matias-perez-3");
  });
});
