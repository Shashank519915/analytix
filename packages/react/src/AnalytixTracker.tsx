"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isPathExcluded, isPublicEventEnabled } from "@Shashank519915/analytix-core";
import { useAnalytixRuntime } from "./AnalytixProvider";
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
  const { config, siteConfig, consentGranted } = useAnalytixRuntime();
  const pathname = usePathname();
  const lastTracked = useRef("");
  const pageStartedAt = useRef(Date.now());
  const currentPath = useRef("");

  const skipPaths = [...(config.skipPaths ?? []), ...(siteConfig?.exclude_paths ?? [])];
  const requiresConsent = siteConfig?.consent_required ?? false;
  const trackingAllowed = consentGranted && (!requiresConsent || consentGranted);

  useEffect(() => {
    if (!pathname || !trackingAllowed) return;
    if (isPathExcluded(pathname, skipPaths)) return;

    const sendEngagementForPrevious = () => {
      if (!currentPath.current) return;
      if (siteConfig && !isPublicEventEnabled(siteConfig, "engagement")) return;
      trackEngagement(config, currentPath.current, Date.now() - pageStartedAt.current, siteConfig);
    };

    if (lastTracked.current === pathname) return;

    sendEngagementForPrevious();
    lastTracked.current = pathname;
    currentPath.current = pathname;
    pageStartedAt.current = Date.now();

    if (siteConfig && !isPublicEventEnabled(siteConfig, "page_view")) return;

    const content = getContentFromPath(pathname);
    void trackPageView(config, pathname, content ?? undefined, siteConfig);
  }, [pathname, config, siteConfig, trackingAllowed, skipPaths, getContentFromPath]);

  useEffect(() => {
    function onHidden() {
      if (document.visibilityState !== "hidden" || !currentPath.current || !trackingAllowed) return;
      if (siteConfig && !isPublicEventEnabled(siteConfig, "engagement")) return;
      trackEngagement(config, currentPath.current, Date.now() - pageStartedAt.current, siteConfig);
    }
    window.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      window.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
    };
  }, [config, siteConfig, trackingAllowed]);

  return null;
}
