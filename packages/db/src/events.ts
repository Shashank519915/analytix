import {
  isPathExcluded,
  normalizeReferrerHost,
  parseUserAgent,
  type AnalyticsEventInput,
} from "@analytix/core";
import { getDb } from "./client";
import { upsertDailyRollup } from "./rollups";
import { getSiteById } from "./sites";

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  const sql = getDb();
  const site = await getSiteById(input.site_id);
  if (!site) throw new Error("Site not found");

  const parsed = parseUserAgent(input.user_agent);
  const internal = isPathExcluded(input.path, site.exclude_paths);
  const metadata = {
    ...(input.metadata ?? {}),
    browser: parsed.browser,
    device_type: parsed.device_type,
    os: parsed.os,
    visitor_type: input.visitor_type ?? "new",
    referrer_host: normalizeReferrerHost(input.referrer ?? null),
    internal,
  };

  const eventType = input.event_type ?? "page_view";

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
      ${input.content_id ?? null},
      ${input.content_slug ?? null},
      ${input.content_title ?? null},
      ${input.session_id},
      ${input.visitor_fingerprint},
      ${input.referrer ?? null},
      ${input.user_agent ?? null},
      ${input.accept_language ?? null},
      ${input.timezone ?? null},
      ${input.screen_width ?? null},
      ${input.screen_height ?? null},
      ${input.viewport_width ?? null},
      ${input.viewport_height ?? null},
      ${input.device_pixel_ratio ?? null},
      ${input.platform ?? null},
      ${input.connection_type ?? null},
      ${input.ip_hash ?? null},
      ${input.country ?? null},
      ${input.region ?? null},
      ${input.city ?? null},
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
