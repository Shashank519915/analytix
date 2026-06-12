import {
  isFieldEnabled,
  isPathExcluded,
  mergeAnalyticsConfig,
  normalizeReferrerHost,
  parseUserAgent,
  type AnalyticsEventInput,
} from "@Shashank519915/analytix-core";
import { getDb } from "./client";
import { upsertDailyRollup } from "./rollups";
import { getSiteById } from "./sites";

function stripMetadataFields(
  metadata: Record<string, unknown>,
  enabledFields: ReturnType<typeof mergeAnalyticsConfig>
) {
  const next = { ...metadata };
  if (!isFieldEnabled(enabledFields, "utm")) {
    delete next.utm_source;
    delete next.utm_medium;
    delete next.utm_campaign;
    delete next.utm_term;
    delete next.utm_content;
  }
  if (!isFieldEnabled(enabledFields, "device")) {
    delete next.browser;
    delete next.device_type;
    delete next.os;
  }
  return next;
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  const sql = getDb();
  const site = await getSiteById(input.site_id);
  if (!site) throw new Error("Site not found");

  const config = mergeAnalyticsConfig(site.analytics_config);
  const parsed = parseUserAgent(input.user_agent);
  const internal = isPathExcluded(input.path, site.exclude_paths);
  const metadata = stripMetadataFields(
    {
      ...(input.metadata ?? {}),
      browser: parsed.browser,
      device_type: parsed.device_type,
      os: parsed.os,
      visitor_type: input.visitor_type ?? "new",
      referrer_host: normalizeReferrerHost(input.referrer ?? null),
      internal,
    },
    config
  );

  const eventType = input.event_type ?? "page_view";
  const includeDevice = isFieldEnabled(config, "device");
  const includePerformance = isFieldEnabled(config, "performance");
  const includeContent = isFieldEnabled(config, "content");
  const includeGeo = isFieldEnabled(config, "geo");

  await sql`
    INSERT INTO analytics_events (
      site_id, event_type, path, content_id, content_slug, content_title,
      session_id, visitor_fingerprint, referrer, user_agent, accept_language, timezone,
      screen_width, screen_height, viewport_width, viewport_height,
      device_pixel_ratio, platform, connection_type, ip_hash,
      country, region, city, metadata
    ) VALUES (
      ${input.site_id}::uuid,
      ${eventType},
      ${input.path},
      ${includeContent ? (input.content_id ?? null) : null},
      ${includeContent ? (input.content_slug ?? null) : null},
      ${includeContent ? (input.content_title ?? null) : null},
      ${input.session_id},
      ${input.visitor_fingerprint},
      ${input.referrer ?? null},
      ${input.user_agent ?? null},
      ${includeDevice ? (input.accept_language ?? null) : null},
      ${includeDevice ? (input.timezone ?? null) : null},
      ${includeDevice ? (input.screen_width ?? null) : null},
      ${includeDevice ? (input.screen_height ?? null) : null},
      ${includePerformance ? (input.viewport_width ?? null) : null},
      ${includePerformance ? (input.viewport_height ?? null) : null},
      ${includePerformance ? (input.device_pixel_ratio ?? null) : null},
      ${includeDevice ? (input.platform ?? null) : null},
      ${includePerformance ? (input.connection_type ?? null) : null},
      ${input.ip_hash ?? null},
      ${includeGeo ? (input.country ?? null) : null},
      ${includeGeo ? (input.region ?? null) : null},
      ${includeGeo ? (input.city ?? null) : null},
      ${JSON.stringify(metadata)}::jsonb
    )
  `;

  if (!internal) {
    const rawDuration = (input.metadata as Record<string, unknown> | undefined)?.duration_ms;
    const engagementMs =
      eventType === "engagement" && typeof rawDuration === "number" ? rawDuration : undefined;
    await upsertDailyRollup(input.site_id, input.path, eventType, input.visitor_fingerprint, engagementMs);
  }

  if (Math.random() < 0.01) {
    void getSiteById(input.site_id).then((s) => {
      if (s) void import("./rate-limit").then(({ purgeExpiredEvents }) => purgeExpiredEvents(s.id, s.retention_days));
    });
  }
}
