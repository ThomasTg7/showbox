import { describe, expect, it } from "vitest";
import { socialLinks } from "./social-links";

const EMPTY = { instagram: "", tiktok: "", youtube: "", facebook: "", x: "" };

describe("socialLinks", () => {
  it("lists only the networks that have a profile, in a fixed order, with their link", () => {
    expect(socialLinks({ ...EMPTY, x: "@gc", instagram: "@showboxpromotions", facebook: "https://facebook.com/gc" })).toEqual([
      { network: "instagram", label: "Instagram", href: "https://www.instagram.com/showboxpromotions" },
      { network: "facebook", label: "Facebook", href: "https://facebook.com/gc" },
      { network: "x", label: "X", href: "https://x.com/gc" },
    ]);
  });

  it("is empty when no network is set", () => {
    expect(socialLinks(EMPTY)).toEqual([]);
  });

  it("skips a value that is not a usable link instead of showing a broken one", () => {
    expect(socialLinks({ ...EMPTY, instagram: "javascript:alert(1)" })).toEqual([]);
  });
});
