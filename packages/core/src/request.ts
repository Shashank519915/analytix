import { createHash, randomBytes } from "crypto";

export function hashIp(ip: string | null, salt = "analytix"): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function extractClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export function extractGeoFromRequest(request: Request) {
  return {
    country:
      request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      request.headers.get("x-nf-geo-country") ??
      null,
    region:
      request.headers.get("x-vercel-ip-country-region") ??
      request.headers.get("cf-region") ??
      null,
    city:
      request.headers.get("x-vercel-ip-city") ??
      request.headers.get("cf-ipcity") ??
      null,
  };
}

export function normalizeReferrerHost(referrer: string | null): string {
  if (!referrer?.trim()) return "Direct";
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, "") || "Direct";
  } catch {
    return referrer.slice(0, 120);
  }
}

export function generateSiteKey(): string {
  return `sk_live_${randomBytes(24).toString("hex")}`;
}

export function generateApiSecret(): string {
  return `sk_secret_${randomBytes(32).toString("hex")}`;
}

export function isPathExcluded(path: string, excludePaths: string[]): boolean {
  for (const pattern of excludePaths) {
    if (!pattern) continue;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (path.startsWith(prefix)) return true;
    } else if (path === pattern || path.startsWith(`${pattern}/`)) {
      return true;
    }
  }
  return false;
}

export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  // No Origin header: server-side or same-origin non-CORS requests (curl, platform test).
  if (!origin) return true;
  if (allowedOrigins.length === 0) return false;
  return allowedOrigins.some((allowed) => {
    if (allowed === "*") return true;
    return origin === allowed || origin === `https://${allowed}` || origin === `http://${allowed}`;
  });
}

/** Default browser origins for a site domain (create + backfill). */
export function buildDefaultAllowedOrigins(domain: string, extra: string[] = []): string[] {
  const trimmed = domain.trim().replace(/\/$/, "");
  const origins = new Set<string>();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    origins.add(trimmed);
  } else {
    const host = trimmed.replace(/^https?:\/\//, "");
    origins.add(`https://${host}`);
    origins.add(`http://${host}`);
  }

  origins.add("http://localhost:3000");
  origins.add("http://localhost:3001");

  for (const item of extra) {
    const value = item.trim();
    if (value) origins.add(value);
  }

  return [...origins];
}
