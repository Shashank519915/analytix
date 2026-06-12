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

export function collectUtmParams(): Record<string, string | null> {
  if (typeof window === "undefined") {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
}

export function collectClientContext(config: AnalytixConfig) {
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
      utm: collectUtmParams(),
    };
  }

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;

  return {
    session_id: getOrCreateSessionId(config),
    visitor_fingerprint: buildClientFingerprint(config),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen_width: screen.width,
    screen_height: screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio,
    platform: navigator.platform,
    connection_type: connection?.effectiveType ?? null,
    accept_language: navigator.language,
    visitor_type: getVisitorType(config),
    utm: collectUtmParams(),
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

export async function trackPageView(
  config: AnalytixConfig,
  path: string,
  content?: { id?: string; slug?: string; title?: string }
) {
  if (typeof window === "undefined") return;

  const ctx = collectClientContext(config);
  const ok = await sendPayload(config, {
    event_type: "page_view",
    path,
    content_id: content?.id ?? null,
    content_slug: content?.slug ?? null,
    content_title: content?.title ?? null,
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
  content?: { id?: string; slug?: string; title?: string }
) {
  if (typeof window === "undefined" || durationMs < 1000) return;

  const ctx = collectClientContext(config);
  void sendPayload(config, {
    event_type: "engagement",
    path,
    content_id: content?.id ?? null,
    content_slug: content?.slug ?? null,
    content_title: content?.title ?? null,
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
  metadata?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  const ctx = collectClientContext(config);
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
