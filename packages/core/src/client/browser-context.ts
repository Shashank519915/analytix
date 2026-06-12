import { isPublicFieldEnabled } from "../analytics-config";
import type { PublicSiteConfig } from "../analytics-config";
import type { AnalytixClientConfig } from "./types";
import {
  buildClientFingerprint,
  getOrCreateSessionId,
  getStoredTraits,
  getStoredUserId,
  getVisitorType,
} from "./storage";

export function collectUtmParams(siteConfig?: PublicSiteConfig | null) {
  const empty = {
    utm_source: null as string | null,
    utm_medium: null as string | null,
    utm_campaign: null as string | null,
    utm_term: null as string | null,
    utm_content: null as string | null,
  };

  if (typeof window === "undefined") return empty;
  if (siteConfig && !isPublicFieldEnabled(siteConfig, "utm")) return empty;

  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
}

export function collectBrowserContext(
  config: AnalytixClientConfig,
  siteConfig?: PublicSiteConfig | null
) {
  const includeDevice = !siteConfig || isPublicFieldEnabled(siteConfig, "device");
  const includePerformance = !siteConfig || isPublicFieldEnabled(siteConfig, "performance");

  if (typeof window === "undefined") {
    return {
      session_id: "server",
      visitor_fingerprint: "server",
      timezone: null as string | null,
      screen_width: null as number | null,
      screen_height: null as number | null,
      viewport_width: null as number | null,
      viewport_height: null as number | null,
      device_pixel_ratio: null as number | null,
      platform: null as string | null,
      connection_type: null as string | null,
      accept_language: null as string | null,
      visitor_type: "new" as const,
      utm: collectUtmParams(siteConfig),
      user_id: null as string | null,
      traits: {} as Record<string, unknown>,
    };
  }

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection;

  return {
    session_id: getOrCreateSessionId(config),
    visitor_fingerprint: buildClientFingerprint(config),
    timezone: includeDevice ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
    screen_width: includeDevice ? screen.width : null,
    screen_height: includeDevice ? screen.height : null,
    viewport_width: includePerformance ? window.innerWidth : null,
    viewport_height: includePerformance ? window.innerHeight : null,
    device_pixel_ratio: includePerformance ? window.devicePixelRatio : null,
    platform: includeDevice ? navigator.platform : null,
    connection_type: includePerformance ? (connection?.effectiveType ?? null) : null,
    accept_language: includeDevice ? navigator.language : null,
    visitor_type: getVisitorType(config),
    utm: collectUtmParams(siteConfig),
    user_id: getStoredUserId(config),
    traits: getStoredTraits(config),
  };
}
