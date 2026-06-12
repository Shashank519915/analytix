# Analytix platform API reference

Base URL: `{APP_URL}` e.g. `https://your-analytix.example.com`

All JSON unless noted. Times are UTC in DB; buckets returned ISO strings.

---

## Authentication

| Method | Header / cookie | Used on |
|--------|-----------------|---------|
| Site key | `X-Analytix-Site-Key: sk_live_...` | Collect |
| API secret | `X-Analytix-Api-Secret: sk_secret_...` | Summary, export (server-to-server) |
| Session | Cookie `analytix_session` | Platform dashboard UI |

Consumer apps should use **API secret via server proxy**, not expose it to browsers.

---

## POST /api/v1/collect

Record an analytics event.

**Headers:**

```
Content-Type: application/json
X-Analytix-Site-Key: sk_live_...
Origin: https://your-site.com   (optional; enforced if site has allowed_origins)
```

**Body (page view example):**

```json
{
  "event_type": "page_view",
  "path": "/blog/my-post",
  "session_id": "uuid",
  "visitor_fingerprint": "hash",
  "referrer": "https://google.com",
  "content_id": "optional-uuid",
  "content_slug": "optional-slug",
  "content_title": "Optional title",
  "screen_width": 1920,
  "screen_height": 1080,
  "timezone": "America/New_York"
}
```

**Responses:**

| Status | Body |
|--------|------|
| 200 | `{ "ok": true }` or `{ "ok": true, "deduped": true }` |
| 401 | Missing/invalid site key |
| 403 | Origin not in allowed_origins |
| 429 | Rate limit exceeded |

**Notes:**

- Server-side proxy from consumer **without** `Origin` header still works (Bluemint pattern)
- Paths matching site `exclude_paths` (e.g. `/admin*`) are dropped server-side

---

## GET /api/v1/sites/:siteId/summary

Dashboard metrics for a site.

**Headers:**

```
X-Analytix-Api-Secret: sk_secret_...
```

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `range` | `24h` \| `7d` \| `30d` \| `90d` | Preset window |
| `from` | ISO date | Custom range start (with `to`) |
| `to` | ISO date | Custom range end |
| `granularity` | `hour` \| `day` | Chart bucket size |
| `compare` | `1` | Include `previous_period` deltas |
| `scope` | `all` \| `page` \| `blog` \| `article` | Traffic filter |
| `path` | string | Required for `scope=page` |
| `contentId` | UUID | Required for `scope=article` |
| `includeBlogArticles` | `1` | Include article paths when `path=/blog` |

**Response:**

```json
{
  "summary": {
    "total_page_views": 120,
    "unique_visitors": 45,
    "total_sessions": 60,
    "bounce_rate": 42,
    "avg_engagement_seconds": 38,
    "new_visitors": 30,
    "returning_visitors": 15,
    "realtime_visitors": 3,
    "top_paths": [{ "path": "/", "views": 50, "uniques": 30 }],
    "top_content": [{ "content_id": "...", "content_slug": "...", "content_title": "...", "views": 10 }],
    "buckets": [{ "bucket_start": "...", "page_views": 5, "unique_visitors": 3 }],
    "device_breakdown": [{ "device_type": "desktop", "count": 80 }],
    "browser_breakdown": [{ "browser": "Chrome", "count": 70 }],
    "referrer_breakdown": [{ "referrer": "google.com", "count": 20 }],
    "utm_source_breakdown": [{ "source": "newsletter", "count": 5 }],
    "country_breakdown": [{ "country": "US", "count": 40 }],
    "previous_period": { "total_page_views": 100, "unique_visitors": 40, ... }
  }
}
```

---

## GET /api/v1/sites/:siteId/export

CSV export. Same query params and auth as summary.

**Response:** `text/csv` attachment.

---

## Platform UI routes (session auth)

| Route | Purpose |
|-------|---------|
| `/login`, `/register` | Account auth |
| `/dashboard` | Site list |
| `/dashboard/sites/new` | Create site |
| `/dashboard/sites/:id` | Site detail + embedded dashboard |

---

## Internal platform routes (not for consumers)

| Route | Purpose |
|-------|---------|
| `POST /api/auth/login` | Platform login |
| `POST /api/auth/register` | Platform register |
| `GET/POST /api/sites` | Site CRUD (session) |

---

## Consumer proxy pattern (recommended)

Instead of calling platform APIs from the browser:

```
Browser → GET /api/admin/analytics → Platform summary (secret on server)
Browser → POST /api/analytics/collect → Platform collect (site key on server)
```

See [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md).
