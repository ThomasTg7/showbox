import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPreviewToken, verifyPreviewToken } from "./preview";

const HOUR = 60 * 60 * 1000;
const ID = "5b1c3a50-7c1f-4a3e-9d76-0a1b2c3d4e5f";
const original = process.env.BETTER_AUTH_SECRET;

beforeEach(() => {
  process.env.BETTER_AUTH_SECRET = "preview-test-secret";
});
afterEach(() => {
  process.env.BETTER_AUTH_SECRET = original;
});

describe("preview tokens", () => {
  it("accepts a fresh token for the same entity and id", () => {
    const token = createPreviewToken("fighter", ID);
    expect(verifyPreviewToken(token)).toBe(true);
    expect(verifyPreviewToken(token, { entity: "fighter", id: ID })).toBe(true);
  });

  it("rejects an expired token after one hour", () => {
    const token = createPreviewToken("fighter", ID, new Date(Date.now() - 2 * HOUR));
    expect(verifyPreviewToken(token)).toBe(false);
  });

  it("is valid right up to one hour and not after", () => {
    const issued = new Date("2026-10-01T10:00:00Z");
    const token = createPreviewToken("post", ID, issued);
    expect(verifyPreviewToken(token, undefined, new Date(issued.getTime() + HOUR - 1))).toBe(true);
    expect(verifyPreviewToken(token, undefined, new Date(issued.getTime() + HOUR + 1))).toBe(false);
  });

  it("rejects a token issued for another entity or id", () => {
    const token = createPreviewToken("fighter", ID);
    expect(verifyPreviewToken(token, { entity: "event", id: ID })).toBe(false);
    expect(verifyPreviewToken(token, { entity: "fighter", id: "otro" })).toBe(false);
  });

  it("rejects a tampered token, another secret and garbage", () => {
    const token = createPreviewToken("fighter", ID);
    const [payload, signature] = token.split(".");
    expect(verifyPreviewToken(`${payload}x.${signature}`)).toBe(false);
    expect(verifyPreviewToken(`${payload}.${signature?.slice(1)}a`)).toBe(false);
    process.env.BETTER_AUTH_SECRET = "otro-secreto";
    expect(verifyPreviewToken(token)).toBe(false);
    expect(verifyPreviewToken("")).toBe(false);
    expect(verifyPreviewToken("no-es-un-token")).toBe(false);
  });
});
