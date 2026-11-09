import { describe, expect, it } from "vitest";
import { floatingVisibility, initialFloatingState, isIdlePaused, reduceFloating, type FloatingEvent, type FloatingState } from "./floating-visibility";

const run = (events: FloatingEvent[], from: FloatingState = initialFloatingState) => events.reduce(reduceFloating, from);
const visibility = (events: FloatingEvent[] = [], from?: FloatingState) => floatingVisibility(run(events, from));

describe("floatingVisibility", () => {
  it("shows both controls on a page without a cover", () => {
    expect(floatingVisibility(initialFloatingState)).toEqual({ navbarHidden: false, ticketsHidden: false });
  });

  it("hides both controls while a cover is visible and releases them once it is gone", () => {
    expect(visibility([{ type: "cover", visible: true }])).toEqual({ navbarHidden: true, ticketsHidden: true });
    expect(visibility([{ type: "cover", visible: true }, { type: "cover", visible: false }])).toEqual({ navbarHidden: false, ticketsHidden: false });
  });

  it("keeps the cover clear through tap, mouse and scroll activity", () => {
    const state = run([{ type: "cover", visible: true }, { type: "activity" }, { type: "scroll", y: 300 }, { type: "scroll", y: 280 }]);
    expect(floatingVisibility(state)).toEqual({ navbarHidden: true, ticketsHidden: true });
  });

  it("lets keyboard navigation bring the navbar back over the cover, but not the tickets", () => {
    expect(visibility([{ type: "cover", visible: true }, { type: "key", navigates: true }])).toEqual({ navbarHidden: false, ticketsHidden: true });
    expect(visibility([{ type: "cover", visible: true }, { type: "key", navigates: true }, { type: "pointer" }]).navbarHidden).toBe(true);
    expect(visibility([{ type: "cover", visible: true }, { type: "key", navigates: false }]).navbarHidden).toBe(true);
  });

  it("opens the menu above the cover and pins the navbar", () => {
    const covered = run([{ type: "cover", visible: true }, { type: "menu", open: true }]);
    expect(floatingVisibility(covered).navbarHidden).toBe(false);
    const scrolled = run([{ type: "scroll", y: 400 }, { type: "menu", open: true }, { type: "idle", level: "all" }]);
    expect(floatingVisibility(scrolled).navbarHidden).toBe(false);
    expect(floatingVisibility(run([{ type: "menu", open: false }], scrolled)).navbarHidden).toBe(true);
  });
});

describe("scroll", () => {
  it("hides only the navbar on a downward scroll and restores it upward", () => {
    expect(visibility([{ type: "scroll", y: 160 }])).toEqual({ navbarHidden: true, ticketsHidden: false });
    expect(visibility([{ type: "scroll", y: 160 }, { type: "scroll", y: 148 }]).navbarHidden).toBe(false);
  });

  it("ignores movement below eight pixels", () => {
    const base = run([{ type: "scroll", y: 160 }]);
    expect(run([{ type: "scroll", y: 157 }], base)).toBe(base);
    expect(run([{ type: "scroll", y: 165 }], base)).toBe(base);
    expect(floatingVisibility(run([{ type: "scroll", y: 152 }], base)).navbarHidden).toBe(false);
  });

  it("always shows the navbar near the top of the page", () => {
    expect(visibility([{ type: "scroll", y: 300 }, { type: "scroll", y: 10 }]).navbarHidden).toBe(false);
    expect(visibility([{ type: "scroll", y: -50 }])).toEqual({ navbarHidden: false, ticketsHidden: false });
  });

  it("does not bring the navbar back from idle on a downward scroll, but does for the tickets", () => {
    const idle = run([{ type: "scroll", y: 100 }, { type: "scroll", y: 90 }, { type: "idle", level: "tickets" }, { type: "idle", level: "all" }]);
    expect(floatingVisibility(idle)).toEqual({ navbarHidden: true, ticketsHidden: true });
    expect(floatingVisibility(run([{ type: "scroll", y: 130 }], idle))).toEqual({ navbarHidden: true, ticketsHidden: false });
    expect(floatingVisibility(run([{ type: "scroll", y: 70 }], idle))).toEqual({ navbarHidden: false, ticketsHidden: false });
  });

  it("does not wake idle controls with a sub-threshold nudge", () => {
    const idle = run([{ type: "scroll", y: 100 }, { type: "idle", level: "all" }]);
    expect(run([{ type: "scroll", y: 104 }], idle)).toBe(idle);
  });
});

describe("anchor", () => {
  it("starts from a restored scroll position without hiding the navbar", () => {
    const state = run([{ type: "anchor", y: 600 }]);
    expect(floatingVisibility(state).navbarHidden).toBe(false);
    expect(run([{ type: "anchor", y: 600 }], state)).toBe(state);
    expect(floatingVisibility(run([{ type: "scroll", y: 604 }], state)).navbarHidden).toBe(false);
    expect(floatingVisibility(run([{ type: "scroll", y: 620 }], state)).navbarHidden).toBe(true);
    expect(run([{ type: "anchor", y: -5 }]).scrollAnchor).toBe(0);
  });
});

describe("idle", () => {
  it("hides the tickets first and the navbar later, and any activity restores both", () => {
    const tickets = run([{ type: "idle", level: "tickets" }]);
    expect(floatingVisibility(tickets)).toEqual({ navbarHidden: false, ticketsHidden: true });
    const all = run([{ type: "idle", level: "all" }], tickets);
    expect(floatingVisibility(all)).toEqual({ navbarHidden: true, ticketsHidden: true });
    expect(floatingVisibility(run([{ type: "activity" }], all))).toEqual({ navbarHidden: false, ticketsHidden: false });
  });

  it("keeps the downward navbar hidden through plain activity", () => {
    const down = run([{ type: "scroll", y: 200 }, { type: "activity" }, { type: "pointer" }]);
    expect(floatingVisibility(down).navbarHidden).toBe(true);
  });

  it("ignores idle while something is held", () => {
    const held = run([{ type: "hold", control: "navbar", source: "hover", active: true }]);
    expect(run([{ type: "idle", level: "all" }], held)).toBe(held);
  });

  it("counts every activity in its epoch so the adapter can re-arm the timer", () => {
    expect(run([{ type: "activity" }, { type: "activity" }]).epoch).toBe(2);
  });
});

describe("holds", () => {
  it("keeps a held control visible against scroll and idle, per control", () => {
    const hovered = run([{ type: "scroll", y: 300 }, { type: "hold", control: "navbar", source: "hover", active: true }]);
    expect(floatingVisibility(hovered).navbarHidden).toBe(false);
    const tickets = run([{ type: "hold", control: "tickets", source: "focus", active: true }]);
    expect(floatingVisibility(tickets).ticketsHidden).toBe(false);
    const release = run([{ type: "hold", control: "navbar", source: "hover", active: false }], hovered);
    expect(floatingVisibility(release).navbarHidden).toBe(true);
  });

  it("does not release a hold the other source still keeps", () => {
    const both = run([
      { type: "hold", control: "navbar", source: "hover", active: true },
      { type: "hold", control: "navbar", source: "focus", active: true },
      { type: "hold", control: "navbar", source: "hover", active: false },
    ]);
    expect(isIdlePaused(both)).toBe(true);
  });

  it("holds do not override the cover", () => {
    const state = run([{ type: "cover", visible: true }, { type: "hold", control: "navbar", source: "hover", active: true }]);
    expect(floatingVisibility(state).navbarHidden).toBe(true);
  });

  it("pauses idle while the menu is open or anything is held, and not otherwise", () => {
    expect(isIdlePaused(initialFloatingState)).toBe(false);
    expect(isIdlePaused(run([{ type: "menu", open: true }]))).toBe(true);
    expect(isIdlePaused(run([{ type: "hold", control: "tickets", source: "hover", active: true }]))).toBe(true);
  });

  it("returns the same state for a no-op hold", () => {
    expect(run([{ type: "hold", control: "navbar", source: "hover", active: false }])).toBe(initialFloatingState);
  });
});

describe("reset and no-op events", () => {
  it("starts each route without the previous route's scroll direction, idle state or keyboard override", () => {
    const previous = run([
      { type: "key", navigates: true },
      { type: "scroll", y: 500 },
      { type: "idle", level: "all" },
      { type: "cover", visible: true },
    ]);
    const state = run([{ type: "navigate", y: 200 }], previous);
    expect(state).toMatchObject({ scrollAnchor: 200, scrollingDown: false, idle: "none", keyboardNavigation: false });
    expect(floatingVisibility(state)).toEqual({ navbarHidden: true, ticketsHidden: true });
  });

  it("reset clears transient state but remembers the cover", () => {
    const state = run([{ type: "cover", visible: true }, { type: "scroll", y: 500 }, { type: "key", navigates: true }, { type: "menu", open: true }, { type: "reset" }]);
    expect(state).toEqual({ ...initialFloatingState, coverVisible: true });
  });

  it("returns the same state when the cover or menu do not change", () => {
    const state = run([{ type: "cover", visible: true }]);
    expect(run([{ type: "cover", visible: true }], state)).toBe(state);
    expect(run([{ type: "menu", open: false }], state)).toBe(state);
    expect(run([{ type: "pointer" }], state)).toBe(state);
  });
});
