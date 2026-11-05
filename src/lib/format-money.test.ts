import { describe, expect, it } from "vitest";
import { formatUsd, formatThousands, parseThousands } from "./format-money";

describe("formatUsd", () => {
  it("writes pesos with a dollar sign and a dot as the thousands separator", () => {
    expect(formatUsd(15000)).toBe("$15.000");
    expect(formatUsd(45000)).toBe("$45.000");
    expect(formatUsd(1250000)).toBe("$1.250.000");
  });

  it("writes small amounts and zero without decimals", () => {
    expect(formatUsd(500)).toBe("$500");
    expect(formatUsd(0)).toBe("$0");
  });
});

describe("formatThousands and parseThousands", () => {
  it("adds the dot every three digits while typing, ignoring anything that is not a digit", () => {
    expect(formatThousands("15000")).toBe("15.000");
    expect(formatThousands("1250000")).toBe("1.250.000");
    expect(formatThousands("15.0000")).toBe("150.000");
    expect(formatThousands("$ 25 000")).toBe("25.000");
    expect(formatThousands("900")).toBe("900");
    expect(formatThousands("")).toBe("");
    expect(formatThousands("abc")).toBe("");
  });

  it("drops leading zeros but keeps a single zero", () => {
    expect(formatThousands("007500")).toBe("7.500");
    expect(formatThousands("0")).toBe("0");
  });

  it("reads the written amount back as a number, or null when there is none", () => {
    expect(parseThousands("15.000")).toBe(15000);
    expect(parseThousands("1.250.000")).toBe(1250000);
    expect(parseThousands("")).toBeNull();
    expect(parseThousands("   ")).toBeNull();
  });
});
