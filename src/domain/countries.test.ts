import { describe, expect, it } from "vitest";
import { listCountries } from "./countries";

describe("listCountries", () => {
  const countries = listCountries();

  it("puts Chile first, then the rest of the priority countries", () => {
    expect(countries.slice(0, 3).map((country) => country.code)).toEqual(["CL", "AR", "PE"]);
    expect(countries[0]).toEqual({ code: "CL", name: "Chile" });
  });

  it("sorts every other country by its Spanish name", () => {
    const rest = countries.slice(11).map((country) => country.name);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, "es")));
    expect(rest).toContain("España");
  });

  it("has no duplicates", () => {
    expect(new Set(countries.map((country) => country.code)).size).toBe(countries.length);
  });
});
