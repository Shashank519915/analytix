/** Shared origin defaults for seed + backfill scripts (no TS build required). */

export function buildDefaultAllowedOrigins(domain, extra = []) {
  const trimmed = domain.trim().replace(/\/$/, "");
  const origins = new Set();

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

export function parseExtraOriginsEnv() {
  const raw = process.env.BACKFILL_EXTRA_ORIGINS ?? "";
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
