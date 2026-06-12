import { getDb } from "./client";

export async function upsertDailyRollup(
  siteId: string,
  path: string,
  eventType: string,
  visitorFingerprint: string,
  engagementMs?: number
): Promise<void> {
  const sql = getDb();
  const day = new Date().toISOString().slice(0, 10);
  const pathKey = path || "";

  if (eventType === "page_view") {
    await sql`
      INSERT INTO analytics_daily_rollups (site_id, day, path, page_views, unique_visitors, sessions)
      VALUES (${siteId}::uuid, ${day}::date, ${pathKey}, 1, 1, 0)
      ON CONFLICT (site_id, day, path)
      DO UPDATE SET page_views = analytics_daily_rollups.page_views + 1
    `;
  } else if (eventType === "engagement" && engagementMs) {
    await sql`
      INSERT INTO analytics_daily_rollups (site_id, day, path, page_views, unique_visitors, sessions, engagement_ms, engagement_events)
      VALUES (${siteId}::uuid, ${day}::date, ${pathKey}, 0, 0, 0, ${Math.round(engagementMs)}, 1)
      ON CONFLICT (site_id, day, path)
      DO UPDATE SET
        engagement_ms = analytics_daily_rollups.engagement_ms + ${Math.round(engagementMs)},
        engagement_events = analytics_daily_rollups.engagement_events + 1
    `;
  }

  void visitorFingerprint;
}
