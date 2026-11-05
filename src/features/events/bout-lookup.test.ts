import { describe, expect, it } from "vitest";
import { boutHref, findEventBout } from "./bout-lookup";
import type { BoutDTO } from "./dto";

const bout = (id: string) => ({ id }) as BoutDTO;

describe("findEventBout", () => {
  const event = { segments: [{ id: "s1", name: "Cartelera estelar", startsAt: null, bouts: [bout("a")] }, { id: "s2", name: "Preliminares", startsAt: null, bouts: [bout("b"), bout("c")] }] };

  it("finds the fight with the name of its block", () => {
    expect(findEventBout(event, "c")).toEqual({ bout: { id: "c" }, segmentName: "Preliminares" });
  });

  it("returns null for a fight of another event", () => {
    expect(findEventBout(event, "zzz")).toBeNull();
  });
});

describe("boutHref", () => {
  it("links to the fight page under its event", () => {
    expect(boutHref("showbox-fight-night-1", "abc")).toBe("/eventos/showbox-fight-night-1/peleas/abc");
  });
});
