"use client";

import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore, type FocusEvent, type PointerEvent as ReactPointerEvent } from "react";
import { floatingVisibility, type FloatingControl } from "@/domain/floating-visibility";
import { dispatchFloating, getFloatingState, subscribeFloating } from "./floating-controls-store";

/** Hover and keyboard focus keep a control on screen; touch hover is ignored (it sticks after a tap). */
function useInteractionProps(control: FloatingControl) {
  return useMemo(() => ({
    onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch") dispatchFloating({ type: "hold", control, source: "hover", active: true });
    },
    onPointerLeave: () => dispatchFloating({ type: "hold", control, source: "hover", active: false }),
    onFocusCapture: () => dispatchFloating({ type: "hold", control, source: "focus", active: true }),
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) dispatchFloating({ type: "hold", control, source: "focus", active: false });
    },
  }), [control]);
}

function useReleaseOnUnmount(control: FloatingControl) {
  useEffect(() => () => {
    dispatchFloating({ type: "hold", control, source: "hover", active: false });
    dispatchFloating({ type: "hold", control, source: "focus", active: false });
  }, [control]);
}

/** Top navbar. A cover is only known once its `CoverMarker` mounts; until then the marker itself keeps the first paint clear. */
export function useNavbarVisibility(menuOpen: boolean, pathname: string) {
  const hidden = useSyncExternalStore(subscribeFloating, () => floatingVisibility(getFloatingState()).navbarHidden, () => false);
  const interactionProps = useInteractionProps("navbar");
  useReleaseOnUnmount("navbar");
  useLayoutEffect(() => {
    dispatchFloating({ type: "navigate", y: window.scrollY });
  }, [pathname]);
  useEffect(() => {
    dispatchFloating({ type: "menu", open: menuOpen });
    return () => dispatchFloating({ type: "menu", open: false });
  }, [menuOpen]);
  return { hidden, interactionProps };
}

/** Bottom ticket bar: hidden in the server render because it only shows once the cover has been left behind. */
export function useTicketsVisibility() {
  const hidden = useSyncExternalStore(subscribeFloating, () => floatingVisibility(getFloatingState()).ticketsHidden, () => true);
  const interactionProps = useInteractionProps("tickets");
  useReleaseOnUnmount("tickets");
  return { hidden, interactionProps };
}
