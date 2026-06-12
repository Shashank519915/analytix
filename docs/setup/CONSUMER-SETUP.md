# Consumer setup — connect a website to Analytix

How to wire any Next.js site (Bluemint is the reference implementation) to a hosted or local Analytix platform.

---

## Architecture

```
Browser  →  Your site /api/analytics/collect  →  Analytix POST /api/v1/collect
Admin UI →  Your site /api/admin/analytics    →  Analytix GET  /api/v1/sites/:id/summary
```

**Why proxy?** Keeps `api_secret` server-only and lets you enrich events (e.g. blog post metadata) before forwarding.

---

## Prerequisites

- Analytix platform running (local or https://your-analytix.example.com)
- A **Site** created (via seed or dashboard) with keys copied

---

## Step 1 — Install npm packages

In your consumer `package.json`:

```json
{
  "dependencies": {
    "@analytix/core": "^0.2.2",
    "@analytix/react": "^0.2.2",
    "@analytix/dashboard": "^0.2.2"
  }
}
```

Optional `.npmrc` (explicit registry — no token needed):

```
@analytix:registry=https://registry.npmjs.org/
```

### `next.config.ts`

```typescript
transpilePackages: [
  "@analytix/core",
  "@analytix/react",
  "@analytix/dashboard",
],
```

---

## Step 2 — Environment variables

```env
# Server only — never NEXT_PUBLIC_
ANALYTICS_API_URL=http://localhost:3001
ANALYTICS_SITE_ID=<uuid-from-analytix>
ANALYTICS_API_SECRET=sk_secret_...

# Client — site key is intentionally public (write-only)
NEXT_PUBLIC_ANALYTICS_SITE_ID=<same-uuid>
NEXT_PUBLIC_ANALYTICS_SITE_KEY=sk_live_...

# Optional — default proxies through your app
# NEXT_PUBLIC_ANALYTICS_COLLECT_URL=/api/analytics/collect
```

| Variable | Local | Production |
|----------|-------|--------------|
| `ANALYTICS_API_URL` | `http://localhost:3001` | `https://your-analytix.example.com` |

---

## Step 3 — Config helper

Create `src/lib/analytix-config.ts`:

```typescript
export function getAnalytixServerConfig() {
  const apiUrl = process.env.ANALYTICS_API_URL?.replace(/\/$/, "");
  const apiSecret = process.env.ANALYTICS_API_SECRET;
  const siteId = process.env.ANALYTICS_SITE_ID;
  const siteKey = process.env.NEXT_PUBLIC_ANALYTICS_SITE_KEY;
  if (!apiUrl || !apiSecret || !siteId || !siteKey) return null;
  return { apiUrl, apiSecret, siteId, siteKey };
}

export function getAnalytixClientConfig() {
  const siteKey = process.env.NEXT_PUBLIC_ANALYTICS_SITE_KEY;
  if (!siteKey) return null;
  return {
    siteKey,
    collectUrl: process.env.NEXT_PUBLIC_ANALYTICS_COLLECT_URL?.replace(/\/$/, "") || "/api/analytics/collect",
    configUrl: process.env.NEXT_PUBLIC_ANALYTICS_CONFIG_URL?.replace(/\/$/, "") || "/api/analytics/config",
    storagePrefix: "mysite",
    skipPaths: ["/admin", "/preview"],
  };
}
```

---

## Step 4 — Client tracking (layout)

Wrap the app with `@analytix/react`:

```tsx
// src/components/analytics/AnalytixLoader.tsx
import { getAnalytixClientConfig } from "@/lib/analytix-config";
import { AnalytixProvider, AnalytixTracker } from "@analytix/react";

export default function AnalytixLoader() {
  const config = getAnalytixClientConfig();
  if (!config) return null;
  return (
    <AnalytixProvider config={config}>
      <AnalytixTracker />
    </AnalytixProvider>
  );
}
```

Add to root `layout.tsx`:

```tsx
import AnalytixLoader from "@/components/analytics/AnalytixLoader";
// inside <body>:
<AnalytixLoader />
```

Tracking is disabled until `NEXT_PUBLIC_ANALYTICS_SITE_KEY` is set.

---

## Step 5 — Collect proxy route

`src/app/api/analytics/collect/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAnalytixServerConfig } from "@/lib/analytix-config";

export async function POST(request: Request) {
  const config = getAnalytixServerConfig();
  if (!config) {
    return NextResponse.json({ error: "Analytics not configured" }, { status: 503 });
  }

  const body = await request.json();
  const upstream = await fetch(`${config.apiUrl}/api/v1/collect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Analytix-Site-Key": config.siteKey,
    },
    body: JSON.stringify(body),
  });

  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
```

Add site-specific enrichment here (Bluemint adds blog `content_id` / `view_count` sync).

---

## Step 6 — Admin summary proxy

`src/app/api/admin/analytics/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAnalytixServerConfig } from "@/lib/analytix-config";

export async function GET(request: Request) {
  const config = getAnalytixServerConfig();
  if (!config) {
    return NextResponse.json({ error: "Analytics not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams(searchParams);
  params.set("compare", params.get("compare") ?? "1");

  const upstream = await fetch(
    `${config.apiUrl}/api/v1/sites/${config.siteId}/summary?${params}`,
    {
      headers: { "X-Analytix-Api-Secret": config.apiSecret },
      cache: "no-store",
    }
  );

  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
```

Protect with your existing admin auth middleware.

CSV export: proxy `GET /api/v1/sites/:id/export` the same way (see Bluemint `src/app/api/admin/analytics/export/route.ts`).

---

## Step 7 — Admin dashboard UI

**Option A — Generic embeddable package**

```tsx
import { AnalyticsDashboard } from "@analytix/dashboard";
import "@analytix/dashboard/styles.css";

<AnalyticsDashboard
  siteId={process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID!}
  summaryEndpoint="/api/admin/analytics"
  exportEndpoint="/api/admin/analytics/export"
/>
```

**Option B — Custom dashboard (Bluemint approach)**

Build your own UI calling `/api/admin/analytics` — richer filters, site-specific pickers, branded skeleton. See Bluemint `src/app/admin/(panel)/analytics/AdminAnalyticsDashboard.tsx`.

**Option C — Use platform UI only**

Skip embedding — view analytics at https://your-analytix.example.com/dashboard.

---

## Step 8 — Verify

1. Start Analytix + consumer locally
2. Browse public pages (not `/admin`)
3. Open admin analytics — data should appear within ~1 minute
4. Check Analytix dashboard — same site data

---

## Reference implementation

See [../agents/REFERENCE-IMPLEMENTATION.md](../agents/REFERENCE-IMPLEMENTATION.md) for file map and proxy patterns.

---

## Next

- [Netlify deploy for consumer](./DEPLOY-NETLIFY.md#consumer-site)
- [Agent integration guide](../agents/INTEGRATE-NEXTJS.md)
