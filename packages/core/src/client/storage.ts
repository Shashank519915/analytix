import type { AnalytixClientConfig, IdentifyTraits } from "./types";

function prefix(config: AnalytixClientConfig, key: string) {
  return `${config.storagePrefix ?? "analytix"}_${key}`;
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateVisitorId(config: AnalytixClientConfig): string {
  if (typeof window === "undefined") return "server";
  const key = prefix(config, "visitor_id");
  let id = localStorage.getItem(key);
  if (!id) {
    id = randomId();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getOrCreateSessionId(config: AnalytixClientConfig): string {
  if (typeof window === "undefined") return "server";
  const key = prefix(config, "session_id");
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = randomId();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function getVisitorType(config: AnalytixClientConfig): "new" | "returning" {
  if (typeof window === "undefined") return "new";
  return localStorage.getItem(prefix(config, "has_visited")) ? "returning" : "new";
}

export function markVisitorAsReturning(config: AnalytixClientConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(prefix(config, "has_visited"), "1");
}

export function getStoredUserId(config: AnalytixClientConfig): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(prefix(config, "user_id"));
}

export function setStoredUserId(config: AnalytixClientConfig, userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(prefix(config, "user_id"), userId);
}

export function getStoredTraits(config: AnalytixClientConfig): IdentifyTraits {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(prefix(config, "traits"));
    return raw ? (JSON.parse(raw) as IdentifyTraits) : {};
  } catch {
    return {};
  }
}

export function setStoredTraits(config: AnalytixClientConfig, traits: IdentifyTraits): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(prefix(config, "traits"), JSON.stringify(traits));
}

export function buildClientFingerprint(config: AnalytixClientConfig): string {
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
