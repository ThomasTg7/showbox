import { describe, expect, it } from "vitest";
import { fightersCanonicalPath, fightersHref, isFilteredList, parsePublicFilters } from "./public-filters";

describe("parsePublicFilters", () => {
  it("defaults to active fighters and page 1", () => {
    expect(parsePublicFilters({})).toEqual({ filters: { status: "active" }, page: 1 });
  });

  it("maps the URL params to filters", () => {
    const { filters, page } = parsePublicFilters({ q: "  cevallos ", division: "peso-superligero", pais: "cl", genero: "female", estado: "retired", pagina: "3" });
    expect(filters).toEqual({ q: "cevallos", division: "peso-superligero", nationality: "CL", gender: "female", status: "retired" });
    expect(page).toBe(3);
  });

  it("lets estado=all list every career status", () => {
    expect(parsePublicFilters({ estado: "all" }).filters.status).toBeUndefined();
  });

  it("ignores invalid values instead of failing", () => {
    const { filters, page } = parsePublicFilters({ genero: "otro", estado: "xyz", pais: "chile", division: ["a", "b"], pagina: "-2" });
    expect(filters).toEqual({ status: "active" });
    expect(page).toBe(1);
  });

  it("keeps only the first value of a repeated param and caps the search length", () => {
    expect(parsePublicFilters({ q: ["uno", "dos"] }).filters.q).toBe("uno");
    expect(parsePublicFilters({ q: "x".repeat(200) }).filters.q).toHaveLength(60);
  });
});

describe("fightersHref", () => {
  it("builds a shareable URL, omitting defaults", () => {
    expect(fightersHref({ status: "active" }, 1)).toBe("/boxeadores");
    expect(fightersHref({ q: "cevallos", division: "peso-superligero", status: "active" }, 2)).toBe("/boxeadores?q=cevallos&division=peso-superligero&pagina=2");
    expect(fightersHref({ nationality: "AR", gender: "male", status: "retired" }, 1)).toBe("/boxeadores?pais=AR&genero=male&estado=retired");
    expect(fightersHref({}, 1)).toBe("/boxeadores?estado=all");
  });
});

describe("isFilteredList", () => {
  it("is false for the default listing (active fighters) and true for any search or filter", () => {
    expect(isFilteredList({ status: "active" })).toBe(false);
    expect(isFilteredList({ q: "cevallos", status: "active" })).toBe(true);
    expect(isFilteredList({ division: "peso-superligero", status: "active" })).toBe(true);
    expect(isFilteredList({ nationality: "AR", status: "active" })).toBe(true);
    expect(isFilteredList({ gender: "female", status: "active" })).toBe(true);
    expect(isFilteredList({ status: "retired" })).toBe(true);
    expect(isFilteredList({})).toBe(true);
  });
});

describe("fightersCanonicalPath", () => {
  it("sends every filtered or searched listing to /boxeadores", () => {
    expect(fightersCanonicalPath({ division: "peso-superligero", status: "active" }, 1)).toBe("/boxeadores");
    expect(fightersCanonicalPath({ q: "cevallos", status: "active" }, 3)).toBe("/boxeadores");
    expect(fightersCanonicalPath({ status: "retired" }, 2)).toBe("/boxeadores");
  });

  it("keeps the page of the plain listing as its own canonical URL", () => {
    expect(fightersCanonicalPath({ status: "active" }, 1)).toBe("/boxeadores");
    expect(fightersCanonicalPath({ status: "active" }, 2)).toBe("/boxeadores?pagina=2");
  });
});
