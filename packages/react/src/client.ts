import type { PublicSiteConfig } from "@analytix/core";
import { isPublicFieldEnabled, shouldDropEventForSampling } from "@analytix/core";
import type { AnalytixConfig } from "./AnalytixProvider";

function prefix(config: AnalytixConfig, key: string) {
  return `${config.storagePrefix ?? "analytix"}_${key}`;
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateVisitorId(config: AnalytixConfig): string {
  if (typeof window === "undefined") return "server";
  const key = prefix(config, "visitor_id");
  let id = localStorage.getItem(key);
  if (!id) {
    id = randomId();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getOrCreateSessionId(config: AnalytixConfig): string {
  if (typeof window === "undefined") return "server";
  const key = prefix(config, "session_id");
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = randomId();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function getVisitorType(config: AnalytixConfig): "new" | "returning" {
  if (typeof window === "undefined") return "new";
  return localStorage.getItem(prefix(config, "has_visited")) ? "returning" : "new";
}

export function markVisitorAsReturning(config: AnalytixConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(prefix(config, "has_visited"), "1");
}

export function buildClientFingerprint(config: AnalytixConfig): string {
  if (typeof window === "undefined") return "server";
  return [
    getOrCreateVisitorId(config),
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    String(screen.width),
    String(screen.height),
    String(window.devicePixelRatio ?? 1),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");
}

export function collectUtmParams(siteConfig?: PublicSiteConfig | null) {
  const empty = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
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

export function collectClientContext(config: AnalytixConfig, siteConfig?: PublicSiteConfig | null) {
  const includeDevice = !siteConfig || isPublicFieldEnabled(siteConfig, "device");
  const includePerformance = !siteConfig || isPublicFieldEnabled(siteConfig, "performance");

  if (typeof window === "undefined") {
    return {
      session_id: "server",
      visitor_fingerprint: "server",
      timezone: null,
      screen_width: null,
      screen_height: null,
      viewport_width: null,
      viewport_height: null,
      device_pixel_ratio: null,
      platform: null,
      connection_type: null,
      accept_language: null,
      visitor_type: "new" as const,
      utm: collectUtmParams(siteConfig),
    };
  }

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;

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
  };
}

async function sendPayload(config: AnalytixConfig, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(config.collectUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Analytix-Site-Key": config.siteKey,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function shouldClientSample(siteConfig?: PublicSiteConfig | null): boolean {
  if (!siteConfig) return false;
  return shouldDropEventForSampling({
    collection_profile: siteConfig.collection_profile,
    enabled_events: siteConfig.enabled_events,
    enabled_fields: siteConfig.enabled_fields,
    sample_rate: siteConfig.sample_rate,
    consent_required: siteConfig.consent_required,
    dashboard_widgets: siteConfig.dashboard_widgets,
    dashboard_theme: siteConfig.dashboard_theme,
  });
}

export async function trackPageView(
  config: AnalytixConfig,
  path: string,
  content?: { id?: string; slug?: string; title?: string },
  siteConfig?: PublicSiteConfig | null
) {
  if (typeof window === "undefined") return;
  if (shouldClientSample(siteConfig)) return;

  const ctx = collectClientContext(config, siteConfig);
  const includeContent = !siteConfig || isPublicFieldEnabled(siteConfig, "content");
  const ok = await sendPayload(config, {
    event_type: "page_view",
    path,
    content_id: includeContent ? (content?.id ?? null) : null,
    content_slug: includeContent ? (content?.slug ?? null) : null,
    content_title: includeContent ? (content?.title ?? null) : null,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    session_id: ctx.session_id,
    visitor_fingerprint: ctx.visitor_fingerprint,
    timezone: ctx.timezone,
    screen_width: ctx.screen_width,
    screen_height: ctx.screen_height,
    viewport_width: ctx.viewport_width,
    viewport_height: ctx.viewport_height,
    device_pixel_ratio: ctx.device_pixel_ratio,
    platform: ctx.platform,
    connection_type: ctx.connection_type,
    accept_language: ctx.accept_language,
    visitor_type: ctx.visitor_type,
    metadata: {
      page_title: document.title,
      href: window.location.href,
      ...ctx.utm,
    },
  });

  if (ok && ctx.visitor_type === "new") {
    markVisitorAsReturning(config);
  }
}

export function trackEngagement(
  config: AnalytixConfig,
  path: string,
  durationMs: number,
  siteConfig?: PublicSiteConfig | null,
  content?: { id?: string; slug?: string; title?: string }
) {
  if (typeof window === "undefined" || durationMs < 1000) return;
  if (shouldClientSample(siteConfig)) return;

  const ctx = collectClientContext(config, siteConfig);
  const includeContent = !siteConfig || isPublicFieldEnabled(siteConfig, "content");
  void sendPayload(config, {
    event_type: "engagement",
    path,
    content_id: includeContent ? (content?.id ?? null) : null,
    content_slug: includeContent ? (content?.slug ?? null) : null,
    content_title: includeContent ? (content?.title ?? null) : null,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    session_id: ctx.session_id,
    visitor_fingerprint: ctx.visitor_fingerprint,
    timezone: ctx.timezone,
    screen_width: ctx.screen_width,
    screen_height: ctx.screen_height,
    viewport_width: ctx.viewport_width,
    viewport_height: ctx.viewport_height,
    device_pixel_ratio: ctx.device_pixel_ratio,
    platform: ctx.platform,
    connection_type: ctx.connection_type,
    accept_language: ctx.accept_language,
    visitor_type: ctx.visitor_type,
    metadata: {
      duration_ms: durationMs,
      page_title: document.title,
    },
  });
}

export function trackCustomEvent(
  config: AnalytixConfig,
  path: string,
  eventName: string,
  metadata?: Record<string, unknown>,
  siteConfig?: PublicSiteConfig | null
) {
  if (typeof window === "undefined") return;
  if (shouldClientSample(siteConfig)) return;

  const ctx = collectClientContext(config, siteConfig);
  void sendPayload(config, {
    event_type: "custom",
    path,
    session_id: ctx.session_id,
    visitor_fingerprint: ctx.visitor_fingerprint,
    visitor_type: ctx.visitor_type,
    user_agent: navigator.userAgent,
    metadata: { event_name: eventName, ...metadata },
  });
}
