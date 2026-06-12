import {
  DEFAULT_SITE_ANALYTICS_CONFIG,
  buildDefaultAllowedOrigins,
  generateApiSecret,
  generateSiteKey,
  mergeAnalyticsConfig,
  toPublicSiteConfig,
} from "@analytix/core";
import type { PublicSiteConfig, SiteAnalyticsConfig, SiteRecord } from "@analytix/core";
import { getDb } from "./client";
import { firstRow, asRows } from "./rows";

function parseSiteRow(row: Record<string, unknown>): SiteRecord {
  const createdAt = row.created_at;
  return {
    id: row.id as string,
    account_id: row.account_id as string,
    name: row.name as string,
    domain: row.domain as string,
    site_key: row.site_key as string,
    api_secret: row.api_secret as string,
    exclude_paths: (row.exclude_paths as string[]) ?? [],
    allowed_origins: (row.allowed_origins as string[]) ?? [],
    retention_days: row.retention_days as number,
    analytics_config: mergeAnalyticsConfig(
      (row.analytics_config as Partial<SiteAnalyticsConfig> | null) ?? DEFAULT_SITE_ANALYTICS_CONFIG
    ),
    created_at:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === "string"
          ? createdAt
          : String(createdAt ?? ""),
  };
}

export async function createSite(
  accountId: string,
  input: {
    name: string;
    domain: string;
    exclude_paths?: string[];
    allowed_origins?: string[];
    retention_days?: number;
  }
): Promise<SiteRecord> {
  const sql = getDb();
  const site_key = generateSiteKey();
  const api_secret = generateApiSecret();
  const exclude_paths = JSON.stringify(input.exclude_paths ?? ["/admin*", "/blog/preview*"]);
  const allowed_origins = JSON.stringify(
    input.allowed_origins?.length
      ? input.allowed_origins
      : buildDefaultAllowedOrigins(input.domain)
  );
  const analytics_config = JSON.stringify(DEFAULT_SITE_ANALYTICS_CONFIG);

  const rows = await sql`
    INSERT INTO sites (
      account_id, name, domain, site_key, api_secret, exclude_paths, allowed_origins, retention_days, analytics_config
    )
    VALUES (
      ${accountId}::uuid,
      ${input.name},
      ${input.domain},
      ${site_key},
      ${api_secret},
      ${exclude_paths}::jsonb,
      ${allowed_origins}::jsonb,
      ${input.retention_days ?? 365},
      ${analytics_config}::jsonb
    )
    RETURNING *
  `;
  return parseSiteRow(firstRow<Record<string, unknown>>(rows)!);
}

export async function listSitesForAccount(accountId: string): Promise<SiteRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM sites WHERE account_id = ${accountId}::uuid ORDER BY created_at DESC
  `;
  return asRows<Record<string, unknown>>(rows).map(parseSiteRow);
}

export async function getSiteById(id: string): Promise<SiteRecord | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM sites WHERE id = ${id}::uuid LIMIT 1`;
  const row = firstRow<Record<string, unknown>>(rows);
  if (!row) return null;
  return parseSiteRow(row);
}

export async function getSiteBySiteKey(siteKey: string): Promise<SiteRecord | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM sites WHERE site_key = ${siteKey} LIMIT 1`;
  const row = firstRow<Record<string, unknown>>(rows);
  if (!row) return null;
  return parseSiteRow(row);
}

export async function getSiteByApiSecret(apiSecret: string): Promise<SiteRecord | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM sites WHERE api_secret = ${apiSecret} LIMIT 1`;
  const row = firstRow<Record<string, unknown>>(rows);
  if (!row) return null;
  return parseSiteRow(row);
}

export async function updateSite(
  siteId: string,
  input: {
    name?: string;
    domain?: string;
    exclude_paths?: string[];
    allowed_origins?: string[];
    retention_days?: number;
    analytics_config?: Partial<import("@analytix/core").SiteAnalyticsConfig>;
  }
): Promise<SiteRecord | null> {
  const sql = getDb();
  const current = await getSiteById(siteId);
  if (!current) return null;

  const name = input.name ?? current.name;
  const domain = input.domain ?? current.domain;
  const exclude_paths = JSON.stringify(input.exclude_paths ?? current.exclude_paths);
  const nextOrigins = input.allowed_origins ?? current.allowed_origins;
  const allowed_origins = JSON.stringify(
    nextOrigins.length ? nextOrigins : buildDefaultAllowedOrigins(domain)
  );
  const retention_days = input.retention_days ?? current.retention_days;
  const analytics_config = JSON.stringify(
    mergeAnalyticsConfig({
      ...current.analytics_config,
      ...(input.analytics_config ?? {}),
    })
  );

  const rows = await sql`
    UPDATE sites
    SET
      name = ${name},
      domain = ${domain},
      exclude_paths = ${exclude_paths}::jsonb,
      allowed_origins = ${allowed_origins}::jsonb,
      retention_days = ${retention_days},
      analytics_config = ${analytics_config}::jsonb
    WHERE id = ${siteId}::uuid
    RETURNING *
  `;
  const row = firstRow<Record<string, unknown>>(rows);
  if (!row) return null;
  return parseSiteRow(row);
}

export function getPublicSiteConfig(site: SiteRecord): PublicSiteConfig {
  return toPublicSiteConfig({
    analytics_config: site.analytics_config,
    exclude_paths: site.exclude_paths,
  });
}

export async function regenerateSiteKeys(siteId: string): Promise<SiteRecord | null> {
  const sql = getDb();
  const site_key = generateSiteKey();
  const api_secret = generateApiSecret();
  const rows = await sql`
    UPDATE sites SET site_key = ${site_key}, api_secret = ${api_secret}
    WHERE id = ${siteId}::uuid
    RETURNING *
  `;
  const row = firstRow<Record<string, unknown>>(rows);
  if (!row) return null;
  return parseSiteRow(row);
}
