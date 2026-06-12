"use client";

import { useEffect, useRef } from "react";
import { isPathExcluded, isPublicEventEnabled } from "@analytix/core";
import { useAnalytixRuntime } from "./AnalytixProvider";
import { useBrowserPathname } from "./useBrowserPathname";

export interface AnalytixTrackerProps {
  /** Override pathname (e.g. from Next.js `usePathname`). Defaults to browser history. */
  pathname?: string;
  getContentFromPath?: (pathname: string) => { id?: string; slug?: string; title?: string } | null;
}

function defaultGetContent(pathname: string) {
  const match = pathname.match(/^\/blog\/([^/]+)$/);
  if (!match || match[1] === "preview") return null;
  return { slug: decodeURIComponent(match[1]!) };
}

export function AnalytixTracker({
  pathname: pathnameProp,
  getContentFromPath = defaultGetContent,
}: AnalytixTrackerProps) {
  const browserPathname = useBrowserPathname();
  const pathname = pathnameProp ?? browserPathname;
  const { config, client, siteConfig, configReady, consentGranted } = useAnalytixRuntime();
  const lastTracked = useRef("");
  const pageStartedAt = useRef(Date.now());
  const currentPath = useRef("");

  const skipPaths = [...(config.skipPaths ?? []), ...(siteConfig?.exclude_paths ?? [])];
  const requiresConsent = siteConfig?.consent_required === true;
  const trackingAllowed =
    configReady && consentGranted && (!requiresConsent || consentGranted);

  useEffect(() => {
    if (!pathname || !trackingAllowed) return;
    if (isPathExcluded(pathname, skipPaths)) return;

    const sendEngagementForPrevious = () => {
      if (!currentPath.current) return;
      if (siteConfig && !isPublicEventEnabled(siteConfig, "engagement")) return;
      void client.engagement(
        currentPath.current,
        Date.now() - pageStartedAt.current,
        getContentFromPath(currentPath.current) ?? undefined
      );
    };

    if (lastTracked.current === pathname) return;

    sendEngagementForPrevious();
    lastTracked.current = pathname;
    currentPath.current = pathname;
    pageStartedAt.current = Date.now();

    if (siteConfig && !isPublicEventEnabled(siteConfig, "page_view")) return;

    const content = getContentFromPath(pathname);
    void client.page({ path: pathname, content: content ?? undefined });
  }, [pathname, config, siteConfig, trackingAllowed, skipPaths, getContentFromPath, client]);

  useEffect(() => {
    function onHidden() {
      if (document.visibilityState !== "hidden" || !currentPath.current || !trackingAllowed) return;
      if (siteConfig && !isPublicEventEnabled(siteConfig, "engagement")) return;
      void client.engagement(
        currentPath.current,
        Date.now() - pageStartedAt.current,
        getContentFromPath(currentPath.current) ?? undefined
      );
    }
    window.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      window.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
    };
  }, [siteConfig, trackingAllowed, getContentFromPath, client]);

  return null;
}
