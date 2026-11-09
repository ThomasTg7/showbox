import { initialFloatingState, isIdlePaused, reduceFloating, type FloatingEvent, type FloatingState } from "@/domain/floating-visibility";

/** Idle time before the ticket bar leaves, and before the navbar follows. */
export const TICKETS_IDLE_MS = 3_000;
export const NAVBAR_IDLE_MS = 4_000;
const MOUSE_MOVE_THROTTLE_MS = 150;

/**
 * Browser adapter for `domain/floating-visibility`: one module-level state, one set of passive window listeners
 * and one idle timer shared by the navbar and the ticket bar. All rules live in the domain reducer.
 */
const listeners = new Set<() => void>();
const covers = new Map<object, boolean>();
let state: FloatingState = initialFloatingState;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastMouseMove = 0;

export const getFloatingState = () => state;

export function dispatchFloating(event: FloatingEvent) {
  const previous = state;
  state = reduceFloating(previous, event);
  if (state === previous) return;
  listeners.forEach(listener => listener());
  if (listeners.size && (state.epoch !== previous.epoch || state.idle !== previous.idle)) armIdleTimer();
}

function armIdleTimer() {
  clearTimeout(timer);
  if (isIdlePaused(state) || state.idle === "all") return;
  const stage = state.idle === "none" ? "tickets" : "all";
  timer = setTimeout(() => dispatchFloating({ type: "idle", level: stage }), stage === "tickets" ? TICKETS_IDLE_MS : NAVBAR_IDLE_MS - TICKETS_IDLE_MS);
}

/** Several covers can coexist (a page may mount more than one): the controls hide while any is on screen. */
export function setCoverVisible(token: object, visible: boolean | null) {
  if (visible === null) covers.delete(token);
  else covers.set(token, visible);
  dispatchFloating({ type: "cover", visible: [...covers.values()].some(Boolean) });
}

const onScroll = () => dispatchFloating({ type: "scroll", y: window.scrollY });
const onActivity = () => dispatchFloating({ type: "activity" });
const onKeyDown = (event: KeyboardEvent) => dispatchFloating({ type: "key", navigates: event.key === "Tab" || event.key === "Escape" });

/** A touch that turns into a scroll ends in `pointercancel` and must not wake anything; only a finished tap does. */
const onPointerDown = (event: PointerEvent) => {
  dispatchFloating({ type: "pointer" });
  if (event.pointerType !== "touch") onActivity();
};
const onPointerUp = (event: PointerEvent) => {
  if (event.pointerType === "touch") onActivity();
};
const onPointerMove = (event: PointerEvent) => {
  if (event.pointerType === "touch") return;
  const now = Date.now();
  if (now - lastMouseMove < MOUSE_MOVE_THROTTLE_MS) return;
  lastMouseMove = now;
  onActivity();
};

export function subscribeFloating(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    dispatchFloating({ type: "anchor", y: window.scrollY });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("focus", onActivity, { passive: true });
    armIdleTimer();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("focus", onActivity);
    clearTimeout(timer);
    lastMouseMove = 0;
    state = reduceFloating(state, { type: "reset" });
  };
}
