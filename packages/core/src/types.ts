import type { SiteAnalyticsConfig } from "./analytics-config";

export type AnalyticsGranularity = "hour" | "day";
export type AnalyticsEventType =
  | "page_view"
  | "engagement"
  | "custom"
  | "scroll_depth"
  | "outbound_click";
export type AnalyticsScope = "all" | "page" | "blog" | "article";

export interface AnalyticsEventInput {
  site_id: string;
  event_type?: AnalyticsEventType;
  path: string;
  content_id?: string | null;
  content_slug?: string | null;
  content_title?: string | null;
  session_id: string;
  visitor_fingerprint: string;
  referrer?: string | null;
  user_agent?: string | null;
  accept_language?: string | null;
  timezone?: string | null;
  screen_width?: number | null;
  screen_height?: number | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  device_pixel_ratio?: number | null;
  platform?: string | null;
  connection_type?: string | null;
  ip_hash?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  visitor_type?: "new" | "returning" | null;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsFilters {
  site_id: string;
  from: string;
  to: string;
  granularity: AnalyticsGranularity;
  scope?: AnalyticsScope | null;
  path?: string | null;
  contentId?: string | null;
  includeBlogArticles?: boolean;
  exclude_paths?: string[];
}

export interface PeriodComparison {
  total_page_views: number;
  unique_visitors: number;
  total_sessions: number;
  bounce_rate: number;
  avg_engagement_seconds: number;
}

export interface AnalyticsBucketRow {
  bucket_start: string;
  page_views: number;
  unique_visitors: number;
}

export interface AnalyticsSummary {
  total_page_views: number;
  unique_visitors: number;
  total_sessions: number;
  admin_page_views: number;
  admin_unique_visitors: number;
  bounce_rate: number;
  pages_per_session: number;
  avg_engagement_seconds: number;
  new_visitors: number;
  returning_visitors: number;
  realtime_visitors: number;
  top_paths: Array<{ path: string; views: number; uniques: number }>;
  top_content: Array<{
    content_id: string;
    content_slug: string;
    content_title: string;
    views: number;
  }>;
  landing_pages: Array<{ path: string; sessions: number }>;
  buckets: AnalyticsBucketRow[];
  device_breakdown: Array<{ device_type: string; count: number }>;
  browser_breakdown: Array<{ browser: string; count: number }>;
  os_breakdown: Array<{ os: string; count: number }>;
  language_breakdown: Array<{ language: string; count: number }>;
  country_breakdown: Array<{ country: string; count: number }>;
  region_breakdown: Array<{ region: string; count: number }>;
  referrer_breakdown: Array<{ referrer: string; count: number }>;
  utm_source_breakdown: Array<{ source: string; count: number }>;
  utm_medium_breakdown: Array<{ medium: string; count: number }>;
  utm_campaign_breakdown: Array<{ campaign: string; count: number }>;
  utm_term_breakdown: Array<{ term: string; count: number }>;
  utm_content_breakdown: Array<{ content: string; count: number }>;
  channel_breakdown: Array<{ channel: string; count: number }>;
  previous_period?: PeriodComparison;
}

export interface SiteRecord {
  id: string;
  account_id: string;
  name: string;
  domain: string;
  site_key: string;
  api_secret: string;
  exclude_paths: string[];
  allowed_origins: string[];
  retention_days: number;
  analytics_config: SiteAnalyticsConfig;
  created_at: string;
}

export interface AccountRecord {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}
