import { describe, expect, it } from "vitest";
import { BRAND } from "./brand";

describe("ShowBox Promotions identity", () => {
  it("exposes the official name and the red of the supplied logo", () => {
    expect(BRAND.name).toBe("ShowBox Promotions");
    expect(BRAND.shortName).toBe("ShowBox");
    expect(BRAND.colors).toMatchObject({ primary: "#E3101F", bright: "#FF1226", ember: "#8E1B17" });
  });
});
