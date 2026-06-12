# Integrate Analytix into a Next.js project (agent checklist)

Follow these steps in order. Check off each item before moving on.

**Reference:** [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md)

---

## Phase 0 — Prerequisites

- [ ] Analytix platform is running (local `:3001` or production URL)
- [ ] A **Site** exists; operator provides:
  - `ANALYTICS_SITE_ID` (UUID)
  - `NEXT_PUBLIC_ANALYTICS_SITE_KEY` (`sk_live_...`)
  - `ANALYTICS_API_SECRET` (`sk_secret_...`)
- [ ] GitHub PAT with `read:packages` for npm install

---

## Phase 1 — Dependencies

### 1.1 `package.json`

```json
"@analytix/react": "^0.2.2",
"@analytix/dashboard": "^0.2.2"
```

Add `@analytix/core` only if importing types directly.

### 1.2 `.npmrc`

```
@analytix:registry=https://registry.npmjs.org/
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

### 1.3 `next.config.ts`

```typescript
transpilePackages: [
  "@analytix/core",
  "@analytix/react",
  "@analytix/dashboard",
],
```

### 1.4 Install

```bash
npm install
```

---

## Phase 2 — Environment

Add to `.env.example` and `.env.local`:

```env
ANALYTICS_API_URL=http://localhost:3001
ANALYTICS_SITE_ID=
ANALYTICS_API_SECRET=
NEXT_PUBLIC_ANALYTICS_SITE_ID=
NEXT_PUBLIC_ANALYTICS_SITE_KEY=
```

Production: `ANALYTICS_API_URL=https://your-analytix.example.com` (or operator URL).

See [ENV-VARS.md](./ENV-VARS.md) for full table.

---

## Phase 3 — Server config helper

Create `src/lib/analytix-config.ts`:

- `getAnalytixServerConfig()` — returns null if misconfigured; used by API routes
- `getAnalytixClientConfig()` — returns null if no site key; used by tracker
- `isAnalytixEnabled()` — optional guard

Copy from your consumer project's `analytix-config.ts` or see [CONSUMER-SETUP.md](../setup/CONSUMER-SETUP.md).

---

## Phase 4 — Client tracking

### 4.1 Loader component

`src/components/analytics/AnalytixLoader.tsx`:

- Read `getAnalytixClientConfig()`
- Render `<AnalytixProvider>` + `<AnalytixTracker>`
- Return `null` if disabled (no env)

### 4.2 Root layout

Import `AnalytixLoader` in `src/app/layout.tsx` inside `<body>`.

### 4.3 Optional content enrichment

Pass `getContentFromPath` to `AnalytixTracker` for blog slugs:

```tsx
<AnalytixTracker
  getContentFromPath={(pathname) => {
    const m = pathname.match(/^\/blog\/([^/]+)$/);
    return m ? { slug: decodeURIComponent(m[1]) } : null;
  }}
/>
```

Enrich with `content_id` in collect proxy if needed.

---

## Phase 5 — API proxy routes

### 5.1 Collect

`src/app/api/analytics/collect/route.ts`

- `POST` only
- Forward body to `{ANALYTICS_API_URL}/api/v1/collect`
- Header: `X-Analytix-Site-Key: {siteKey from server config}`
- Return upstream status + JSON

### 5.2 Summary (admin)

`src/app/api/admin/analytics/route.ts`

- Protect with existing admin auth
- Forward query string to `{ANALYTICS_API_URL}/api/v1/sites/{siteId}/summary`
- Header: `X-Analytix-Api-Secret: {apiSecret}`
- Append `compare=1` if not present (period deltas)

### 5.3 Export (admin)

`src/app/api/admin/analytics/export/route.ts`

- Same auth + secret header
- Proxy to `.../export`, stream CSV response

---

## Phase 6 — Admin UI

Pick one:

### Option A — Embeddable package (minimal)

```tsx
import dynamic from "next/dynamic";
import "@analytix/dashboard/styles.css";

const AnalyticsDashboard = dynamic(
  () => import("@analytix/dashboard").then((m) => m.AnalyticsDashboard),
  { loading: () => <YourSkeleton /> }
);

<AnalyticsDashboard
  siteId={process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID!}
  summaryEndpoint="/api/admin/analytics"
  exportEndpoint="/api/admin/analytics/export"
  loadingFallback={<YourSkeleton />}
/>
```

### Option B — Custom dashboard (recommended for production sites)

- Copy pattern from [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md)
- Fetch `/api/admin/analytics?...`
- Use existing admin design system + `AnalyticsSkeleton`

If API returns `top_content` but UI expects `top_posts`, adapt in proxy route (see [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md)).

If UI sends `postId`, proxy must map to `contentId` for platform API.

---

## Phase 7 — Netlify / production

- [ ] `NPM_TOKEN` in Netlify env
- [ ] All `ANALYTICS_*` env vars set (production platform URL)
- [ ] `SECRETS_SCAN_OMIT_KEYS` includes `NEXT_PUBLIC_ANALYTICS_SITE_KEY`, `NEXT_PUBLIC_ANALYTICS_SITE_ID`, `ANALYTICS_SITE_ID`
- [ ] `npm run build` passes locally before push

See [../setup/DEPLOY-NETLIFY.md](../setup/DEPLOY-NETLIFY.md)

---

## Phase 8 — Verify

- [ ] Public pages generate network POST to `/api/analytics/collect` (200)
- [ ] Admin analytics page loads metrics
- [ ] Platform dashboard shows same site data
- [ ] No `api_secret` in browser bundle or Network tab from client

---

## Parameter mapping (platform summary API)

| Query param | Values | Notes |
|-------------|--------|-------|
| `range` | `24h`, `7d`, `30d`, `90d` | Date window |
| `granularity` | `hour`, `day` | Chart buckets |
| `compare` | `1` | Include `previous_period` |
| `scope` | `all`, `page`, `blog`, `article` | Traffic filter |
| `path` | e.g. `/blog` | With `scope=page` |
| `contentId` | UUID | With `scope=article` |
| `includeBlogArticles` | `1` | With `path=/blog` |

Legacy consumer code may use `postId` — map to `contentId` in proxy.
