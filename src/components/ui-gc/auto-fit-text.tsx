"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { fittedFontSize } from "@/domain/fit-text";
import { cn } from "@/lib/cn";

function wordsFit(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    for (const match of node.textContent!.matchAll(/\S+/gu)) {
      const range = document.createRange();
      range.setStart(node, match.index!);
      range.setEnd(node, match.index! + match[0].length);
      const rects = [...range.getClientRects()].filter(rect => rect.width > 0);
      if (rects.length > 1 || rects.some(rect => rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) return false;
    }
  }
  return true;
}

/** Measure using the actual variable font, spacing and capitalization from the surrounding title. */
function adjustTextSize(element: HTMLSpanElement, minimum: number) {
  if (!element.clientWidth) return;
  element.style.fontSize = "";
  const style = getComputedStyle(element);
  const preferred = parseFloat(style.fontSize);
  const available = element.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
  const words = element.textContent?.match(/\S+/gu) ?? [];
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  Object.assign(probe.style, {
    position: "absolute", visibility: "hidden", pointerEvents: "none", whiteSpace: "pre",
    overflowWrap: "normal", wordBreak: "normal", width: "max-content", maxWidth: "none",
    padding: "0", border: "0", fontSize: "inherit",
  });
  element.append(probe);
  let longestWord = 0;
  for (const word of words) {
    probe.textContent = word;
    longestWord = Math.max(longestWord, probe.offsetWidth);
  }
  probe.remove();
  const size = fittedFontSize(preferred, available, longestWord, minimum);
  if (size < preferred) element.style.fontSize = `${size}px`;
  // Verify actual glyph layout as well: inline runs and variable fonts may differ from the probe.
  if (!wordsFit(element)) {
    let low = Math.min(minimum, preferred);
    let high = size;
    element.style.fontSize = `${low}px`;
    if (wordsFit(element)) {
      for (let step = 0; step < 7; step++) {
        const middle = (low + high) / 2;
        element.style.fontSize = `${middle}px`;
        if (wordsFit(element)) low = middle;
        else high = middle;
      }
      element.style.fontSize = `${Math.floor(low * 100) / 100}px`;
    }
  }
  element.dataset.fitReady = "true";
}

/** Complete readable text: fit whole words, wrap at spaces, and allow extra lines for extreme names. */
export function AutoFitText({ children, className, minFontSize = 12 }: { children: ReactNode; className?: string; minFontSize?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    let active = true;
    const fit = () => adjustTextSize(element, minFontSize);
    const schedule = () => {
      if (!active) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(element);
    if (element.parentElement) observer?.observe(element.parentElement);
    window.addEventListener("resize", schedule, { passive: true });
    void document.fonts?.ready.then(schedule);
    document.fonts?.addEventListener("loadingdone", schedule);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      document.fonts?.removeEventListener("loadingdone", schedule);
    };
  }, [children, minFontSize]);
  return <span ref={ref} data-fit-text className={cn("block min-w-0 max-w-full whitespace-normal [word-break:normal] [overflow-wrap:anywhere]", className)}>{children}</span>;
}
