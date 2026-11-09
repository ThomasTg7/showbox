"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { setCoverVisible } from "./floating-controls-store";

/**
 * The server cannot tell the navbar (it lives in the layout) that this page has a cover, so until hydration the marker
 * clears the first paint itself. It is rendered only in the server HTML and removed in the same commit in which the
 * navbar takes its real state from the store, so nothing flashes and no CSS `:has()` is needed.
 */
const BEFORE_HYDRATION_CSS = ".sb-header{visibility:hidden;opacity:0;transform:translateY(calc(-100% - 24px));pointer-events:none}";
const noSubscription = () => () => {};

/**
 * Declares that the element it is rendered in is a cover (hero): while any part of it is on screen the navbar and the
 * ticket bar stay hidden. Mount it inside every page hero; nothing else needs to know about routes or ids.
 *
 * It registers before the first paint (layout effect), so a client-side navigation never flashes the navbar; the
 * IntersectionObserver then follows the cover scrolling out through the top of the viewport. It observes the whole
 * cover, not a thin edge, so a jump past it (anchor links, scrollTo) is still seen.
 */
export function CoverMarker() {
  const ref = useRef<HTMLSpanElement>(null);
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  useLayoutEffect(() => {
    const cover = ref.current?.parentElement;
    if (!cover) return;
    const token = {};
    setCoverVisible(token, true);
    const observer = new IntersectionObserver(entries => {
      // Records can queue up between callbacks; the last one is the current state.
      const latest = entries.at(-1);
      if (latest) setCoverVisible(token, latest.boundingClientRect.bottom > 0);
    });
    observer.observe(cover);
    return () => {
      observer.disconnect();
      setCoverVisible(token, null);
    };
  }, []);
  return (
    <>
      {hydrated ? null : <style>{BEFORE_HYDRATION_CSS}</style>}
      <span ref={ref} hidden data-cover-marker />
    </>
  );
}
