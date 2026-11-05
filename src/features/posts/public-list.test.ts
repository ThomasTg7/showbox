import { describe, expect, it } from "vitest";
import { postsListHref } from "./public-list";

describe("postsListHref", () => {
  it("builds the listing URL with only the params that matter", () => {
    expect(postsListHref(undefined, 1)).toBe("/noticias");
    expect(postsListHref("resultados", 1)).toBe("/noticias?categoria=resultados");
    expect(postsListHref(undefined, 2)).toBe("/noticias?pagina=2");
    expect(postsListHref("resultados", 3)).toBe("/noticias?categoria=resultados&pagina=3");
  });
});
