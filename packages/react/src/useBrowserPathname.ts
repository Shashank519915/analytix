"use client";

import { useEffect, useState } from "react";

/** Framework-agnostic pathname for SPAs without Next.js. */
export function useBrowserPathname(): string {
  const [pathname, setPathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : ""
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setPathname(window.location.pathname);

    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);

    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPush(...args);
      update();
    };
    history.replaceState = (...args) => {
      originalReplace(...args);
      update();
    };

    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, []);

  return pathname;
}
