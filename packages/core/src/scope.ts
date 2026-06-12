import type { AnalyticsFilters, AnalyticsScope } from "./types";

export function resolveAnalyticsScope(filters: AnalyticsFilters): {
  scope: AnalyticsScope;
  path: string | null;
  contentId: string | null;
} {
  if (filters.contentId) {
    return { scope: "article", path: null, contentId: filters.contentId };
  }
  if (filters.scope === "blog") {
    return { scope: "blog", path: null, contentId: null };
  }
  const path = filters.path?.trim() || null;
  if (path) {
    return { scope: "page", path, contentId: null };
  }
  return { scope: "all", path: null, contentId: null };
}

export function scopeParams(filters: AnalyticsFilters) {
  const resolved = resolveAnalyticsScope(filters);
  const pageScope =
    resolved.scope === "page" &&
    resolved.path === "/blog" &&
    filters.includeBlogArticles
      ? "page_blog"
      : resolved.scope;

  return {
    scope: pageScope,
    path: resolved.path,
    contentId: resolved.contentId,
  };
}

export function resolveDateRange(input: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}): { from: string; to: string; previousFrom: string; previousTo: string } {
  const now = new Date();
  let from: Date;
  let to = input.to ? new Date(input.to) : now;

  if (input.from) {
    from = new Date(input.from);
  } else {
    from = new Date(now);
    const range = input.range ?? "7d";
    if (range === "24h") from.setHours(from.getHours() - 24);
    else if (range === "30d") from.setDate(from.getDate() - 30);
    else if (range === "90d") from.setDate(from.getDate() - 90);
    else from.setDate(from.getDate() - 7);
  }

  const durationMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime());
  const previousFrom = new Date(from.getTime() - durationMs);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    previousFrom: previousFrom.toISOString(),
    previousTo: previousTo.toISOString(),
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
