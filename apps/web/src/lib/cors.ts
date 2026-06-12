import { isOriginAllowed } from "@analytix/core";

export function buildCorsHeaders(
  origin: string | null,
  allowedOrigins: string[]
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Analytix-Site-Key",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}
