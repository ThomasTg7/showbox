"use client";

import { useEffect, useId, useSyncExternalStore, type FocusEvent, type PointerEvent as ReactPointerEvent } from "react";

const IDLE_MS = 4_000;
const TICKET_IDLE_MS = 3_000;
const IDLE_HIDDEN = 1;
const SCROLL_HIDDEN = 2;
const INTERACTION_HELD = 4;
const TICKET_IDLE_HIDDEN = 8;
const listeners = new Set<() => void>();
const holds = new Set<string>();
let concealed = false;
let ticketsConcealed = false;
let scrollingDown = false;
let scrollAnchor = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastPointerMove = 0;

function setConcealed(value: boolean) {
  if (concealed === value) return;
  concealed = value;
  listeners.forEach(listener => listener());
}

function armTimer() {
  clearTimeout(timer);
  if (holds.size || !listeners.size) return;
  timer = setTimeout(() => {
    ticketsConcealed = true;
    timer = setTimeout(() => setConcealed(true), IDLE_MS - TICKET_IDLE_MS);
    listeners.forEach(listener => listener());
  }, TICKET_IDLE_MS);
}

function reveal() {
  const changed = concealed || ticketsConcealed || scrollingDown;
  concealed = false;
  ticketsConcealed = false;
  scrollingDown = false;
  if (changed) listeners.forEach(listener => listener());
  armTimer();
}

function onScroll() {
  const y = Math.max(0, window.scrollY);
  const delta = y - scrollAnchor;
  let nextDown = scrollingDown;
  if (y <= 24 || Math.abs(delta) >= 8) {
    nextDown = y > 24 && delta > 0;
    scrollAnchor = y;
  }
  const changed = concealed || ticketsConcealed || nextDown !== scrollingDown;
  concealed = false;
  ticketsConcealed = false;
  scrollingDown = nextDown;
  if (changed) listeners.forEach(listener => listener());
  armTimer();
}

function hold(key: string, active: boolean) {
  if (active) {
    holds.add(key);
    clearTimeout(timer);
    concealed = false;
    ticketsConcealed = false;
    listeners.forEach(listener => listener());
  } else if (holds.delete(key)) {
    listeners.forEach(listener => listener());
    armTimer();
  }
}

function pointerMove(event: PointerEvent) {
  if (event.pointerType === "touch") return;
  const now = Date.now();
  if (now - lastPointerMove < 150) return;
  lastPointerMove = now;
  reveal();
}

const activityEvents = ["pointerdown", "keydown", "focus"] as const;

/** One browser subscription/timer shared by the navbar and ticket bar. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    scrollAnchor = Math.max(0, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    activityEvents.forEach(event => window.addEventListener(event, reveal, { passive: true }));
    window.addEventListener("pointermove", pointerMove, { passive: true });
    armTimer();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    window.removeEventListener("scroll", onScroll);
    activityEvents.forEach(event => window.removeEventListener(event, reveal));
    window.removeEventListener("pointermove", pointerMove);
    clearTimeout(timer);
    holds.clear();
    concealed = false;
    ticketsConcealed = false;
    scrollingDown = false;
    scrollAnchor = 0;
    lastPointerMove = 0;
  };
}

const getSnapshot = () => (concealed ? IDLE_HIDDEN : 0) | (ticketsConcealed ? TICKET_IDLE_HIDDEN : 0) | (scrollingDown ? SCROLL_HIDDEN : 0) | (holds.size ? INTERACTION_HELD : 0);
const getServerSnapshot = () => 0;

/** Activity restores controls; hover, focus and an open menu pause auto-hide. */
export function useFloatingControls(pinned = false, kind: "navbar" | "tickets" = "tickets") {
  const id = useId();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hidden = kind === "navbar"
    ? Boolean(snapshot & (IDLE_HIDDEN | SCROLL_HIDDEN))
    : Boolean(snapshot & TICKET_IDLE_HIDDEN);
  useEffect(() => {
    hold(`${id}:pinned`, pinned);
    return () => hold(`${id}:pinned`, false);
  }, [id, pinned]);
  useEffect(() => () => {
    hold(`${id}:hover`, false);
    hold(`${id}:focus`, false);
  }, [id]);

  return {
    hidden: hidden && !pinned && !(snapshot & INTERACTION_HELD),
    interactionProps: {
      onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.pointerType !== "touch") hold(`${id}:hover`, true);
      },
      onPointerLeave: () => hold(`${id}:hover`, false),
      onFocusCapture: () => hold(`${id}:focus`, true),
      onBlurCapture: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hold(`${id}:focus`, false);
      },
    },
  };
}
