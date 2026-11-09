/**
 * Visibility of the two floating controls (top navbar, bottom ticket bar), as a pure reducer.
 * The browser adapter (`components/site/floating-controls-store.ts`) only translates DOM events into these events.
 *
 * Rules: both stay hidden while a cover (hero) is on screen. Past it, the navbar hides on downward scroll and
 * both hide after idle time (tickets first); hovering or focusing a control, or an open menu, keeps it visible.
 */

export type FloatingControl = "navbar" | "tickets";
export type HoldSource = "hover" | "focus";
export type IdleLevel = "none" | "tickets" | "all";

export type FloatingState = {
  coverVisible: boolean;
  scrollingDown: boolean;
  scrollAnchor: number;
  idle: IdleLevel;
  keyboardNavigation: boolean;
  menuOpen: boolean;
  holds: Record<FloatingControl, Record<HoldSource, boolean>>;
  /** Grows with every activity so the adapter knows when to restart its idle timer. */
  epoch: number;
};

export type FloatingEvent =
  | { type: "scroll"; y: number }
  /** Starts tracking from the current scroll position without inferring a direction (first mount, restored scroll). */
  | { type: "anchor"; y: number }
  | { type: "navigate"; y: number }
  /** A tap, mouse movement or window focus: wakes idle controls without touching the scroll direction. */
  | { type: "activity" }
  | { type: "key"; navigates: boolean }
  /** Pointer input ends keyboard navigation; it does not wake anything by itself. */
  | { type: "pointer" }
  | { type: "idle"; level: Exclude<IdleLevel, "none"> }
  | { type: "hold"; control: FloatingControl; source: HoldSource; active: boolean }
  | { type: "cover"; visible: boolean }
  | { type: "menu"; open: boolean }
  | { type: "reset" };

/** Pixels of movement that count as a scroll direction; smaller jitter is ignored. */
export const SCROLL_THRESHOLD = 8;
/** Within this distance from the top the navbar is always available. */
export const TOP_ZONE = 24;

export const initialFloatingState: FloatingState = {
  coverVisible: false,
  scrollingDown: false,
  scrollAnchor: 0,
  idle: "none",
  keyboardNavigation: false,
  menuOpen: false,
  holds: { navbar: { hover: false, focus: false }, tickets: { hover: false, focus: false } },
  epoch: 0,
};

const isHeld = (state: FloatingState, control: FloatingControl) => state.holds[control].hover || state.holds[control].focus;
const woken = (state: FloatingState, changes: Partial<FloatingState>): FloatingState => ({ ...state, ...changes, idle: "none", epoch: state.epoch + 1 });

export function isIdlePaused(state: FloatingState) {
  return state.menuOpen || isHeld(state, "navbar") || isHeld(state, "tickets");
}

export function floatingVisibility(state: FloatingState) {
  const navbarCovered = state.coverVisible && !state.keyboardNavigation;
  const navbarQuiet = state.scrollingDown || state.idle === "all";
  return {
    navbarHidden: !state.menuOpen && (navbarCovered || (!isHeld(state, "navbar") && navbarQuiet)),
    ticketsHidden: state.coverVisible || (!isHeld(state, "tickets") && state.idle !== "none"),
  };
}

function scrolled(state: FloatingState, rawY: number): FloatingState {
  const y = Math.max(0, rawY);
  const delta = y - state.scrollAnchor;
  if (y > TOP_ZONE && Math.abs(delta) < SCROLL_THRESHOLD) return state;
  return woken(state, { scrollAnchor: y, scrollingDown: y > TOP_ZONE && delta > 0 });
}

export function reduceFloating(state: FloatingState, event: FloatingEvent): FloatingState {
  switch (event.type) {
    case "scroll":
      return scrolled(state, event.y);
    case "anchor":
      return state.scrollAnchor === Math.max(0, event.y) ? state : { ...state, scrollAnchor: Math.max(0, event.y) };
    case "navigate":
      return woken(state, { scrollAnchor: Math.max(0, event.y), scrollingDown: false, keyboardNavigation: false });
    case "activity":
      return woken(state, {});
    case "key":
      return woken(state, event.navigates ? { scrollingDown: false, keyboardNavigation: true } : {});
    case "pointer":
      return state.keyboardNavigation ? { ...state, keyboardNavigation: false } : state;
    case "idle":
      return isIdlePaused(state) ? state : { ...state, idle: event.level };
    case "hold": {
      if (state.holds[event.control][event.source] === event.active) return state;
      const holds = { ...state.holds, [event.control]: { ...state.holds[event.control], [event.source]: event.active } };
      return event.active ? woken(state, { holds }) : { ...state, holds, epoch: state.epoch + 1 };
    }
    case "cover":
      return state.coverVisible === event.visible ? state : { ...state, coverVisible: event.visible };
    case "menu":
      if (state.menuOpen === event.open) return state;
      return event.open ? woken(state, { menuOpen: true }) : { ...state, menuOpen: false, epoch: state.epoch + 1 };
    case "reset":
      return { ...initialFloatingState, coverVisible: state.coverVisible };
  }
}
