import { getDb } from "./client";
import { firstRow, asRows } from "./rows";

const WINDOW_MS = 60_000;
const MAX_EVENTS = 120;
const DEDUPE_MS = 3_000;

function windowStart(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

export async function incrementRateLimit(
  siteId: string,
  ipHash: string | null
): Promise<boolean> {
  if (!ipHash) return false;

  const sql = getDb();
  const ws = windowStart();

  const rows = await sql`
    INSERT INTO analytics_rate_limits (site_id, ip_hash, window_start, event_count)
    VALUES (${siteId}::uuid, ${ipHash}, ${ws}::timestamptz, 1)
    ON CONFLICT (site_id, ip_hash, window_start)
    DO UPDATE SET event_count = analytics_rate_limits.event_count + 1
    RETURNING event_count
  `;

  const row = firstRow<{ event_count: number }>(rows);
  return (row?.event_count ?? 0) > MAX_EVENTS;
}

export async function isDuplicatePageView(
  siteId: string,
  sessionId: string,
  path: string,
  eventType: string
): Promise<boolean> {
  if (eventType !== "page_view") return false;

  const sql = getDb();
  const since = new Date(Date.now() - DEDUPE_MS).toISOString();

  const rows = await sql`
    SELECT id FROM analytics_events
    WHERE site_id = ${siteId}::uuid
      AND session_id = ${sessionId}
      AND path = ${path}
      AND event_type = 'page_view'
      AND created_at >= ${since}::timestamptz
    LIMIT 1
  `;

  return asRows(rows).length > 0;
}

export async function purgeExpiredEvents(siteId: string, retentionDays: number): Promise<number> {
  const sql = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const rows = await sql`
    DELETE FROM analytics_events
    WHERE site_id = ${siteId}::uuid
      AND created_at < ${cutoff.toISOString()}::timestamptz
    RETURNING id
  `;
  return asRows(rows).length;
}
