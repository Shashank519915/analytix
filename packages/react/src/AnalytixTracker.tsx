"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAnalytixConfig } from "./AnalytixProvider";
import { trackEngagement, trackPageView } from "./client";

export interface AnalytixTrackerProps {
  /** Extract blog/content slug from pathname */
  getContentFromPath?: (pathname: string) => { id?: string; slug?: string; title?: string } | null;
}

function defaultGetContent(pathname: string) {
  const match = pathname.match(/^\/blog\/([^/]+)$/);
  if (!match || match[1] === "preview") return null;
  return { slug: decodeURIComponent(match[1]!) };
}

export function AnalytixTracker({ getContentFromPath = defaultGetContent }: AnalytixTrackerProps) {
  const config = useAnalytixConfig();
  const pathname = usePathname();
  const lastTracked = useRef("");
  const pageStartedAt = useRef(Date.now());
  const currentPath = useRef("");

  useEffect(() => {
    if (!pathname) return;
    if (config.skipPaths?.some((p) => pathname.startsWith(p))) return;

    const sendEngagementForPrevious = () => {
      if (!currentPath.current) return;
      trackEngagement(config, currentPath.current, Date.now() - pageStartedAt.current);
    };

    if (lastTracked.current === pathname) return;

    sendEngagementForPrevious();
    lastTracked.current = pathname;
    currentPath.current = pathname;
    pageStartedAt.current = Date.now();

    const content = getContentFromPath(pathname);
    void trackPageView(config, pathname, content ?? undefined);
  }, [pathname, config, getContentFromPath]);

  useEffect(() => {
    function onHidden() {
      if (document.visibilityState !== "hidden" || !currentPath.current) return;
      trackEngagement(config, currentPath.current, Date.now() - pageStartedAt.current);
    }
    window.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      window.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
    };
  }, [config]);

  return null;
}
