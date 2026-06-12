import { scopeParams, type AnalyticsFilters, type AnalyticsSummary, type PeriodComparison } from "@Shashank519915/analytix-core";
import { getDb } from "./client";
import { firstRow, asRows } from "./rows";

async function fetchPeriodMetrics(
  siteId: string,
  from: string,
  to: string,
  scope: string,
  path: string | null,
  contentId: string | null
): Promise<PeriodComparison & { pages_per_session: number; new_visitors: number; returning_visitors: number }> {
  const sql = getDb();

  const summaryRows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS total_page_views,
      COUNT(DISTINCT visitor_fingerprint) FILTER (WHERE event_type = 'page_view')::int AS unique_visitors,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view')::int AS total_sessions,
      COUNT(DISTINCT visitor_fingerprint) FILTER (
        WHERE event_type = 'page_view' AND COALESCE(metadata->>'visitor_type', 'new') = 'new'
      )::int AS new_visitors,
      COUNT(DISTINCT visitor_fingerprint) FILTER (
        WHERE event_type = 'page_view' AND metadata->>'visitor_type' = 'returning'
      )::int AS returning_visitors
    FROM analytics_events
    WHERE site_id = ${siteId}::uuid
      AND created_at >= ${from}::timestamptz
      AND created_at <= ${to}::timestamptz
      AND COALESCE((metadata->>'internal')::boolean, false) = false
      AND (
        ${scope} = 'all'
        OR (${scope} = 'page' AND path = ${path})
        OR (
          ${scope} = 'page_blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (
          ${scope} = 'blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (${scope} = 'article' AND content_id = ${contentId})
      )
  `;

  const sessionStats = await sql`
    WITH scoped AS (
      SELECT session_id, COUNT(*)::int AS pages
      FROM analytics_events
      WHERE site_id = ${siteId}::uuid
        AND created_at >= ${from}::timestamptz
        AND created_at <= ${to}::timestamptz
        AND event_type = 'page_view'
        AND COALESCE((metadata->>'internal')::boolean, false) = false
        AND (
          ${scope} = 'all'
          OR (${scope} = 'page' AND path = ${path})
          OR (
            ${scope} = 'page_blog'
            AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
          )
          OR (
            ${scope} = 'blog'
            AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
          )
          OR (${scope} = 'article' AND content_id = ${contentId})
        )
      GROUP BY session_id
    )
    SELECT
      COALESCE(AVG(pages), 0)::float AS pages_per_session,
      COALESCE(COUNT(*) FILTER (WHERE pages = 1)::float / NULLIF(COUNT(*), 0), 0)::float AS bounce_rate
    FROM scoped
  `;

  const engagementStats = await sql`
    SELECT COALESCE(AVG((metadata->>'duration_ms')::float), 0)::float AS avg_ms
    FROM analytics_events
    WHERE site_id = ${siteId}::uuid
      AND created_at >= ${from}::timestamptz
      AND created_at <= ${to}::timestamptz
      AND event_type = 'engagement'
      AND COALESCE((metadata->>'internal')::boolean, false) = false
      AND (
        ${scope} = 'all'
        OR (${scope} = 'page' AND path = ${path})
        OR (
          ${scope} = 'page_blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (
          ${scope} = 'blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (${scope} = 'article' AND content_id = ${contentId})
      )
  `;

  const summary = firstRow<{
    total_page_views: number;
    unique_visitors: number;
    total_sessions: number;
    new_visitors: number;
    returning_visitors: number;
  }>(summaryRows)!;
  const session = firstRow<{ pages_per_session: number; bounce_rate: number }>(sessionStats)!;
  const engagement = firstRow<{ avg_ms: number }>(engagementStats)!;

  return {
    total_page_views: summary.total_page_views,
    unique_visitors: summary.unique_visitors,
    total_sessions: summary.total_sessions,
    new_visitors: summary.new_visitors,
    returning_visitors: summary.returning_visitors,
    bounce_rate: Math.round(session.bounce_rate * 1000) / 10,
    pages_per_session: Math.round(session.pages_per_session * 10) / 10,
    avg_engagement_seconds: Math.round((engagement.avg_ms / 1000) * 10) / 10,
  };
}

export async function getAnalyticsSummary(
  filters: AnalyticsFilters,
  options?: { includePreviousPeriod?: boolean }
): Promise<AnalyticsSummary> {
  const sql = getDb();
  const siteId = filters.site_id;
  const { from, to } = filters;
  const { scope, path, contentId } = scopeParams(filters);

  const current = await fetchPeriodMetrics(siteId, from, to, scope, path, contentId);

  let previous_period: PeriodComparison | undefined;
  if (options?.includePreviousPeriod) {
    const durationMs = new Date(to).getTime() - new Date(from).getTime();
    const prevTo = new Date(from).toISOString();
    const prevFrom = new Date(new Date(from).getTime() - durationMs).toISOString();
    const prev = await fetchPeriodMetrics(siteId, prevFrom, prevTo, scope, path, contentId);
    previous_period = {
      total_page_views: prev.total_page_views,
      unique_visitors: prev.unique_visitors,
      total_sessions: prev.total_sessions,
      bounce_rate: prev.bounce_rate,
      avg_engagement_seconds: prev.avg_engagement_seconds,
    };
  }

  const adminRows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS admin_page_views,
      COUNT(DISTINCT visitor_fingerprint) FILTER (WHERE event_type = 'page_view')::int AS admin_unique_visitors
    FROM analytics_events
    WHERE site_id = ${siteId}::uuid
      AND created_at >= ${from}::timestamptz
      AND created_at <= ${to}::timestamptz
      AND path LIKE '/admin%'
  `;

  const realtimeRows = await sql`
    SELECT COUNT(DISTINCT visitor_fingerprint)::int AS count
    FROM analytics_events
    WHERE site_id = ${siteId}::uuid
      AND event_type = 'page_view'
      AND created_at >= (now() - interval '15 minutes')
      AND COALESCE((metadata->>'internal')::boolean, false) = false
  `;

  const scopeWhere = sql`
    site_id = ${siteId}::uuid
      AND created_at >= ${from}::timestamptz
      AND created_at <= ${to}::timestamptz
      AND event_type = 'page_view'
      AND COALESCE((metadata->>'internal')::boolean, false) = false
      AND (
        ${scope} = 'all'
        OR (${scope} = 'page' AND path = ${path})
        OR (
          ${scope} = 'page_blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (
          ${scope} = 'blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (${scope} = 'article' AND content_id = ${contentId})
      )
  `;

  const topPaths = await sql`
    SELECT path, COUNT(*)::int AS views, COUNT(DISTINCT visitor_fingerprint)::int AS uniques
    FROM analytics_events
    WHERE ${scopeWhere}
    GROUP BY path
    ORDER BY views DESC
    LIMIT 12
  `;

  const topContent = await sql`
    SELECT
      COALESCE(content_id, content_slug, 'unknown') AS content_id,
      COALESCE(content_slug, 'unknown') AS content_slug,
      COALESCE(MAX(content_title), content_slug, 'Unknown') AS content_title,
      COUNT(*)::int AS views
    FROM analytics_events
    WHERE site_id = ${siteId}::uuid
      AND created_at >= ${from}::timestamptz
      AND created_at <= ${to}::timestamptz
      AND event_type = 'page_view'
      AND content_id IS NOT NULL
      AND COALESCE((metadata->>'internal')::boolean, false) = false
      AND (
        ${scope} = 'all'
        OR (${scope} = 'page' AND path = ${path})
        OR (
          ${scope} = 'page_blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (
          ${scope} = 'blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (${scope} = 'article' AND content_id = ${contentId})
      )
    GROUP BY content_id, content_slug
    ORDER BY views DESC
    LIMIT 10
  `;

  const landingPages = await sql`
    WITH scoped_events AS (
      SELECT session_id, path, created_at
      FROM analytics_events
      WHERE site_id = ${siteId}::uuid
        AND created_at >= ${from}::timestamptz
        AND created_at <= ${to}::timestamptz
        AND event_type = 'page_view'
        AND COALESCE((metadata->>'internal')::boolean, false) = false
        AND (
          ${scope} = 'all'
          OR (${scope} = 'page' AND path = ${path})
          OR (
            ${scope} = 'page_blog'
            AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
          )
          OR (
            ${scope} = 'blog'
            AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
          )
          OR (${scope} = 'article' AND content_id = ${contentId})
        )
    ),
    first_hits AS (
      SELECT DISTINCT ON (session_id) session_id, path
      FROM scoped_events
      ORDER BY session_id, created_at ASC
    )
    SELECT path, COUNT(*)::int AS sessions
    FROM first_hits
    GROUP BY path
    ORDER BY sessions DESC
    LIMIT 10
  `;

  const bucketTrunc =
    filters.granularity === "hour"
      ? sql`date_trunc('hour', created_at)`
      : sql`date_trunc('day', created_at)`;

  const rawBuckets = await sql`
    SELECT
      ${bucketTrunc} AS bucket_start,
      COUNT(*)::int AS page_views,
      COUNT(DISTINCT visitor_fingerprint)::int AS unique_visitors
    FROM analytics_events
    WHERE ${scopeWhere}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const breakdownWhere = sql`
    site_id = ${siteId}::uuid
      AND created_at >= ${from}::timestamptz
      AND created_at <= ${to}::timestamptz
      AND event_type = 'page_view'
      AND COALESCE((metadata->>'internal')::boolean, false) = false
      AND (
        ${scope} = 'all'
        OR (${scope} = 'page' AND path = ${path})
        OR (
          ${scope} = 'page_blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (
          ${scope} = 'blog'
          AND (path = '/blog' OR (path LIKE '/blog/%' AND path NOT LIKE '/blog/preview%'))
        )
        OR (${scope} = 'article' AND content_id = ${contentId})
      )
  `;

  const [devices, browsers, osRows, languages, countries, regions, referrers, utmSources, utmMediums, utmCampaigns, utmTerms, utmContents, channels] =
    await Promise.all([
      sql`SELECT COALESCE(NULLIF(metadata->>'device_type', ''), 'Unknown') AS device_type, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      sql`SELECT COALESCE(NULLIF(metadata->>'browser', ''), 'Unknown') AS browser, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      sql`SELECT COALESCE(NULLIF(metadata->>'os', ''), 'Unknown') AS os, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      sql`SELECT COALESCE(NULLIF(split_part(accept_language, ',', 1), ''), 'Unknown') AS language, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      sql`SELECT COALESCE(NULLIF(country, ''), 'Unknown') AS country, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      sql`SELECT COALESCE(NULLIF(region, ''), 'Unknown') AS region, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      sql`SELECT COALESCE(NULLIF(metadata->>'referrer_host', ''), 'Direct') AS referrer, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 10`,
      sql`SELECT COALESCE(NULLIF(metadata->>'utm_source', ''), '(not set)') AS source, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 10`,
      sql`SELECT COALESCE(NULLIF(metadata->>'utm_medium', ''), '(not set)') AS medium, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 10`,
      sql`SELECT COALESCE(NULLIF(metadata->>'utm_campaign', ''), '(not set)') AS campaign, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 10`,
      sql`SELECT COALESCE(NULLIF(metadata->>'utm_term', ''), '(not set)') AS term, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 10`,
      sql`SELECT COALESCE(NULLIF(metadata->>'utm_content', ''), '(not set)') AS content, COUNT(*)::int AS count FROM analytics_events WHERE ${breakdownWhere} GROUP BY 1 ORDER BY count DESC LIMIT 10`,
      sql`
        SELECT channel, COUNT(*)::int AS count
        FROM (
          SELECT
            CASE
              WHEN LOWER(COALESCE(metadata->>'utm_medium', '')) IN ('cpc', 'ppc', 'paid', 'paid-social', 'cpm', 'display') THEN 'Paid'
              WHEN LOWER(COALESCE(metadata->>'utm_medium', '')) = 'email' THEN 'Email'
              WHEN COALESCE(NULLIF(metadata->>'referrer_host', ''), 'Direct') ILIKE 'Direct' THEN 'Direct'
              WHEN LOWER(COALESCE(metadata->>'referrer_host', '')) ~ '(facebook|instagram|linkedin|twitter|t\\.co|x\\.com|reddit|tiktok|youtube|pinterest|threads\\.net)' THEN 'Social'
              WHEN LOWER(COALESCE(metadata->>'referrer_host', '')) ~ '(google\\.|bing\\.|yahoo\\.|duckduckgo\\.|baidu\\.|yandex\\.|ecosia\\.)'
                AND LOWER(COALESCE(metadata->>'utm_medium', '')) NOT IN ('cpc', 'ppc', 'paid') THEN 'Organic'
              ELSE 'Referral'
            END AS channel
          FROM analytics_events
          WHERE ${breakdownWhere}
        ) grouped_channels
        GROUP BY channel
        ORDER BY count DESC
      `,
    ]);

  const admin = firstRow<{ admin_page_views: number; admin_unique_visitors: number }>(adminRows)!;
  const realtime = firstRow<{ count: number }>(realtimeRows)!;

  return {
    total_page_views: current.total_page_views,
    unique_visitors: current.unique_visitors,
    total_sessions: current.total_sessions,
    admin_page_views: admin.admin_page_views,
    admin_unique_visitors: admin.admin_unique_visitors,
    bounce_rate: current.bounce_rate,
    pages_per_session: current.pages_per_session,
    avg_engagement_seconds: current.avg_engagement_seconds,
    new_visitors: current.new_visitors,
    returning_visitors: current.returning_visitors,
    realtime_visitors: realtime.count,
    top_paths: asRows<AnalyticsSummary["top_paths"][number]>(topPaths),
    top_content: asRows<AnalyticsSummary["top_content"][number]>(topContent),
    landing_pages: asRows<AnalyticsSummary["landing_pages"][number]>(landingPages),
    buckets: asRows<AnalyticsSummary["buckets"][number]>(rawBuckets),
    device_breakdown: asRows<AnalyticsSummary["device_breakdown"][number]>(devices),
    browser_breakdown: asRows<AnalyticsSummary["browser_breakdown"][number]>(browsers),
    os_breakdown: asRows<AnalyticsSummary["os_breakdown"][number]>(osRows),
    language_breakdown: asRows<AnalyticsSummary["language_breakdown"][number]>(languages),
    country_breakdown: asRows<AnalyticsSummary["country_breakdown"][number]>(countries),
    region_breakdown: asRows<AnalyticsSummary["region_breakdown"][number]>(regions),
    referrer_breakdown: asRows<AnalyticsSummary["referrer_breakdown"][number]>(referrers),
    utm_source_breakdown: asRows<AnalyticsSummary["utm_source_breakdown"][number]>(utmSources),
    utm_medium_breakdown: asRows<AnalyticsSummary["utm_medium_breakdown"][number]>(utmMediums),
    utm_campaign_breakdown: asRows<AnalyticsSummary["utm_campaign_breakdown"][number]>(utmCampaigns),
    utm_term_breakdown: asRows<AnalyticsSummary["utm_term_breakdown"][number]>(utmTerms),
    utm_content_breakdown: asRows<AnalyticsSummary["utm_content_breakdown"][number]>(utmContents),
    channel_breakdown: asRows<AnalyticsSummary["channel_breakdown"][number]>(channels),
    previous_period,
  };
}

function csvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvSection(title: string, headers: string[], rows: Array<Array<string | number>>): string[] {
  return [
    title,
    headers.join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
    "",
  ];
}

export async function exportAnalyticsCsv(filters: AnalyticsFilters): Promise<string> {
  const summary = await getAnalyticsSummary(filters);
  const lines = [
    ...csvSection("summary", ["metric", "value"], [
      ["total_page_views", summary.total_page_views],
      ["unique_visitors", summary.unique_visitors],
      ["total_sessions", summary.total_sessions],
      ["new_visitors", summary.new_visitors],
      ["returning_visitors", summary.returning_visitors],
      ["bounce_rate", summary.bounce_rate],
      ["pages_per_session", summary.pages_per_session],
      ["avg_engagement_seconds", summary.avg_engagement_seconds],
      ["realtime_visitors", summary.realtime_visitors],
    ]),
    ...csvSection(
      "top_paths",
      ["path", "views", "uniques"],
      summary.top_paths.map((r) => [r.path, r.views, r.uniques])
    ),
    ...csvSection(
      "top_content",
      ["content_id", "content_slug", "content_title", "views"],
      summary.top_content.map((r) => [r.content_id, r.content_slug, r.content_title, r.views])
    ),
    ...csvSection(
      "landing_pages",
      ["path", "sessions"],
      summary.landing_pages.map((r) => [r.path, r.sessions])
    ),
    ...csvSection(
      "channels",
      ["channel", "count"],
      summary.channel_breakdown.map((r) => [r.channel, r.count])
    ),
    ...csvSection(
      "referrers",
      ["referrer", "count"],
      summary.referrer_breakdown.map((r) => [r.referrer, r.count])
    ),
    ...csvSection(
      "utm_source",
      ["source", "count"],
      summary.utm_source_breakdown.map((r) => [r.source, r.count])
    ),
    ...csvSection(
      "utm_medium",
      ["medium", "count"],
      summary.utm_medium_breakdown.map((r) => [r.medium, r.count])
    ),
    ...csvSection(
      "utm_campaign",
      ["campaign", "count"],
      summary.utm_campaign_breakdown.map((r) => [r.campaign, r.count])
    ),
    ...csvSection(
      "utm_term",
      ["term", "count"],
      summary.utm_term_breakdown.map((r) => [r.term, r.count])
    ),
    ...csvSection(
      "utm_content",
      ["content", "count"],
      summary.utm_content_breakdown.map((r) => [r.content, r.count])
    ),
    ...csvSection(
      "countries",
      ["country", "count"],
      summary.country_breakdown.map((r) => [r.country, r.count])
    ),
    ...csvSection(
      "regions",
      ["region", "count"],
      summary.region_breakdown.map((r) => [r.region, r.count])
    ),
    ...csvSection(
      "languages",
      ["language", "count"],
      summary.language_breakdown.map((r) => [r.language, r.count])
    ),
    ...csvSection(
      "devices",
      ["device_type", "count"],
      summary.device_breakdown.map((r) => [r.device_type, r.count])
    ),
    ...csvSection(
      "browsers",
      ["browser", "count"],
      summary.browser_breakdown.map((r) => [r.browser, r.count])
    ),
    ...csvSection(
      "operating_systems",
      ["os", "count"],
      summary.os_breakdown.map((r) => [r.os, r.count])
    ),
    ...csvSection(
      "traffic_buckets",
      ["bucket_start", "page_views", "unique_visitors"],
      summary.buckets.map((r) => [r.bucket_start, r.page_views, r.unique_visitors])
    ),
  ];
  return lines.join("\n");
}
