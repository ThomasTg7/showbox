"use client";

import { useEffect, useState } from "react";

/** Keep the navbar off home/event photography, including when scrolling back into it. */
export function useCoverVisibility(routeKey: string) {
  const hasCover = routeKey === "/" || /^\/eventos\/[^/]+$/.test(routeKey);
  const [cover, setCover] = useState({ routeKey, visible: hasCover });

  useEffect(() => {
    if (!hasCover) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setCover({ routeKey, visible: entry.boundingClientRect.bottom > 0 });
    });
    let observed: Element | null = null;
    function connect() {
      const hero = document.querySelector("[data-site-hero]");
      if (hero === observed) return;
      observer.disconnect();
      observed = hero;
      if (hero) observer.observe(hero);
    }
    const mutations = new MutationObserver(connect);
    mutations.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    connect();
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [hasCover, routeKey]);

  return hasCover && (cover.routeKey === routeKey ? cover.visible : true);
}
