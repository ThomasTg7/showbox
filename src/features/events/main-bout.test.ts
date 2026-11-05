import { describe, expect, it } from "vitest";
import { pickMainBout } from "./main-bout";

const bout = (id: string, status: "scheduled" | "cancelled" | "completed" = "scheduled") => ({ id, status });
const isCancelled = (item: { status: string }) => item.status === "cancelled";

describe("pickMainBout", () => {
  it("is the first bout of the card", () => {
    expect(pickMainBout([bout("a"), bout("b")], isCancelled)?.id).toBe("a");
  });

  it("skips a cancelled headliner: the next bout of the card headlines instead", () => {
    expect(pickMainBout([bout("a", "cancelled"), bout("b"), bout("c")], isCancelled)?.id).toBe("b");
  });

  it("keeps a finished headliner", () => {
    expect(pickMainBout([bout("a", "completed"), bout("b")], isCancelled)?.id).toBe("a");
  });

  it("falls back to the first bout when every bout is cancelled, and to null without bouts", () => {
    expect(pickMainBout([bout("a", "cancelled"), bout("b", "cancelled")], isCancelled)?.id).toBe("a");
    expect(pickMainBout([], isCancelled)).toBeNull();
  });
});
