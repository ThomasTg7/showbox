"use client";

import { useEffect, useId, useSyncExternalStore, type FocusEvent, type PointerEvent as ReactPointerEvent } from "react";

const IDLE_MS = 4_000;
const TICKET_IDLE_MS = 3_000;
const IDLE_HIDDEN = 1;
const SCROLL_HIDDEN = 2;
const NAV_INTERACTION_HELD = 4;
const TICKET_IDLE_HIDDEN = 8;
const TICKET_INTERACTION_HELD = 16;
const NAV_REVEALED = 32;
const KEYBOARD_NAVIGATION = 64;
const listeners = new Set<() => void>();
const holds = new Set<string>();
let concealed = false;
let ticketsConcealed = false;
let scrollingDown = false;
let scrollAnchor = 0;
let navRoute: string | undefined;
let navRevealed = false;
let keyboardNavigation = false;
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
  const changed = concealed || ticketsConcealed;
  concealed = false;
  ticketsConcealed = false;
  if (changed) listeners.forEach(listener => listener());
  armTimer();
}

function onScroll() {
  const y = Math.max(0, window.scrollY);
  const delta = y - scrollAnchor;
  let nextDown = scrollingDown;
  let nextRevealed = navRevealed;
  if (y <= 24 || Math.abs(delta) >= 8) {
    nextDown = y > 24 && delta > 0;
    if (delta <= -8) nextRevealed = true;
    scrollAnchor = y;
  }
  const changed = concealed || ticketsConcealed || nextDown !== scrollingDown || nextRevealed !== navRevealed;
  concealed = false;
  ticketsConcealed = false;
  scrollingDown = nextDown;
  navRevealed = nextRevealed;
  if (changed) listeners.forEach(listener => listener());
  armTimer();
}

function keyboardActivity(event: KeyboardEvent) {
  reveal();
  if (event.key !== "Tab" && event.key !== "Escape") return;
  const changed = scrollingDown || !navRevealed || !keyboardNavigation;
  scrollingDown = false;
  navRevealed = true;
  keyboardNavigation = true;
  if (changed) listeners.forEach(listener => listener());
}

function pointerActivity() {
  const changed = keyboardNavigation;
  keyboardNavigation = false;
  reveal();
  if (changed) listeners.forEach(listener => listener());
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

const activityEvents = ["focus"] as const;

/** One browser subscription/timer shared by the navbar and ticket bar. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    scrollAnchor = Math.max(0, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", keyboardActivity);
    window.addEventListener("pointerdown", pointerActivity, { passive: true });
    activityEvents.forEach(event => window.addEventListener(event, reveal, { passive: true }));
    window.addEventListener("pointermove", pointerMove, { passive: true });
    armTimer();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("keydown", keyboardActivity);
    window.removeEventListener("pointerdown", pointerActivity);
    activityEvents.forEach(event => window.removeEventListener(event, reveal));
    window.removeEventListener("pointermove", pointerMove);
    clearTimeout(timer);
    holds.clear();
    concealed = false;
    ticketsConcealed = false;
    scrollingDown = false;
    scrollAnchor = 0;
    navRoute = undefined;
    navRevealed = false;
    keyboardNavigation = false;
    lastPointerMove = 0;
  };
}

function getSnapshot() {
  let snapshot = (concealed ? IDLE_HIDDEN : 0) | (ticketsConcealed ? TICKET_IDLE_HIDDEN : 0) | (scrollingDown ? SCROLL_HIDDEN : 0) | (navRevealed ? NAV_REVEALED : 0) | (keyboardNavigation ? KEYBOARD_NAVIGATION : 0);
  for (const key of holds) snapshot |= key.startsWith("navbar:") ? NAV_INTERACTION_HELD : TICKET_INTERACTION_HELD;
  return snapshot;
}
const getServerSnapshot = () => 0;

/** Activity restores idle controls without clearing the navbar's downward-scroll state. */
export function useFloatingControls(pinned = false, kind: "navbar" | "tickets" = "tickets", routeKey?: string) {
  const id = `${kind}:${useId()}`;
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hidden = kind === "navbar"
    ? Boolean(snapshot & (IDLE_HIDDEN | SCROLL_HIDDEN))
    : Boolean(snapshot & TICKET_IDLE_HIDDEN);
  const initialCoverHidden = kind === "navbar" && routeKey === "/" && (navRoute !== routeKey || !(snapshot & NAV_REVEALED));
  const held = snapshot & (kind === "navbar" ? NAV_INTERACTION_HELD : TICKET_INTERACTION_HELD);
  useEffect(() => {
    if (kind !== "navbar" || routeKey === undefined || routeKey === navRoute) return;
    navRoute = routeKey;
    navRevealed = false;
    keyboardNavigation = false;
    scrollingDown = false;
    scrollAnchor = Math.max(0, window.scrollY);
    reveal();
    listeners.forEach(listener => listener());
  }, [kind, routeKey]);
  useEffect(() => {
    hold(`${id}:pinned`, pinned);
    return () => hold(`${id}:pinned`, false);
  }, [id, pinned]);
  useEffect(() => () => {
    hold(`${id}:hover`, false);
    hold(`${id}:focus`, false);
  }, [id]);

  return {
    hidden: !pinned && (initialCoverHidden || (hidden && !held)),
    keyboardNavigation: Boolean(snapshot & KEYBOARD_NAVIGATION),
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
