-- Analytix platform schema (multi-tenant analytics)

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  site_key TEXT UNIQUE NOT NULL,
  api_secret TEXT UNIQUE NOT NULL,
  exclude_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_origins JSONB NOT NULL DEFAULT '[]'::jsonb,
  retention_days INT NOT NULL DEFAULT 365,
  analytics_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sites ADD COLUMN IF NOT EXISTS analytics_config JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_sites_account ON sites (account_id);
CREATE INDEX IF NOT EXISTS idx_sites_site_key ON sites (site_key);
CREATE INDEX IF NOT EXISTS idx_sites_api_secret ON sites (api_secret);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  path TEXT NOT NULL,
  content_id TEXT,
  content_slug TEXT,
  content_title TEXT,
  session_id TEXT NOT NULL,
  visitor_fingerprint TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  accept_language TEXT,
  timezone TEXT,
  screen_width INT,
  screen_height INT,
  viewport_width INT,
  viewport_height INT,
  device_pixel_ratio REAL,
  platform TEXT,
  connection_type TEXT,
  ip_hash TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_site_created ON analytics_events (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_site_path ON analytics_events (site_id, path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_site_content ON analytics_events (site_id, content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_site_fingerprint ON analytics_events (site_id, visitor_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_site_session ON analytics_events (site_id, session_id, path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_site_ip ON analytics_events (site_id, ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  page_views INT NOT NULL DEFAULT 0,
  unique_visitors INT NOT NULL DEFAULT 0,
  sessions INT NOT NULL DEFAULT 0,
  engagement_ms BIGINT NOT NULL DEFAULT 0,
  engagement_events INT NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day, path)
);

CREATE INDEX IF NOT EXISTS idx_rollups_site_day ON analytics_daily_rollups (site_id, day DESC);

CREATE TABLE IF NOT EXISTS analytics_rate_limits (
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  event_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, ip_hash, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON analytics_rate_limits (window_start);
