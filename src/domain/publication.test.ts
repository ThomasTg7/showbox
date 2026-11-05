import { describe, expect, it } from "vitest";
import { isPublic, type PublicationState } from "./publication";

const now = new Date("2026-09-28T12:00:00.000Z");
const oneMinute = 60 * 1000;

function state(overrides: Partial<PublicationState>): PublicationState {
  return {
    status: "draft",
    publishAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("isPublic", () => {
  it("is true for published content that has not been deleted", () => {
    expect(isPublic(state({ status: "published" }), now)).toBe(true);
  });

  it("is false for draft content", () => {
    expect(isPublic(state({ status: "draft" }), now)).toBe(false);
  });

  it("is false for published content that was deleted", () => {
    expect(isPublic(state({ status: "published", deletedAt: now }), now)).toBe(false);
  });

  it("is true for scheduled content whose publishAt is in the past", () => {
    const publishAt = new Date(now.getTime() - oneMinute);
    expect(isPublic(state({ status: "scheduled", publishAt }), now)).toBe(true);
  });

  it("is false for scheduled content whose publishAt is in the future", () => {
    const publishAt = new Date(now.getTime() + oneMinute);
    expect(isPublic(state({ status: "scheduled", publishAt }), now)).toBe(false);
  });

  it("is false for scheduled content with no publishAt", () => {
    expect(isPublic(state({ status: "scheduled", publishAt: null }), now)).toBe(false);
  });
});
