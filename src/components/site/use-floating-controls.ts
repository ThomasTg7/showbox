"use client";

import { useEffect, useId, useSyncExternalStore, type FocusEvent, type PointerEvent } from "react";

const IDLE_MS = 4_000;
const listeners = new Set<() => void>();
const holds = new Set<string>();
let concealed = false;
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
  timer = setTimeout(() => setConcealed(true), IDLE_MS);
}

function reveal() {
  setConcealed(false);
  armTimer();
}

function hold(key: string, active: boolean) {
  if (active) {
    holds.add(key);
    clearTimeout(timer);
    setConcealed(false);
  } else if (holds.delete(key)) {
    armTimer();
  }
}

function pointerMove() {
  const now = Date.now();
  if (now - lastPointerMove < 150) return;
  lastPointerMove = now;
  reveal();
}

const activityEvents = ["scroll", "pointerdown", "keydown", "focus"] as const;

/** One browser subscription/timer shared by the navbar and ticket bar. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    activityEvents.forEach(event => window.addEventListener(event, reveal, { passive: true }));
    window.addEventListener("pointermove", pointerMove, { passive: true });
    armTimer();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    activityEvents.forEach(event => window.removeEventListener(event, reveal));
    window.removeEventListener("pointermove", pointerMove);
    clearTimeout(timer);
    holds.clear();
    concealed = false;
    lastPointerMove = 0;
  };
}

const getSnapshot = () => concealed;
const getServerSnapshot = () => false;

/** Activity restores controls; hover, focus and an open menu pause auto-hide. */
export function useFloatingControls(pinned = false) {
  const id = useId();
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hold(`${id}:pinned`, pinned);
    return () => hold(`${id}:pinned`, false);
  }, [id, pinned]);
  useEffect(() => () => {
    hold(`${id}:hover`, false);
    hold(`${id}:focus`, false);
  }, [id]);

  return {
    hidden: hidden && !pinned,
    interactionProps: {
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
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
