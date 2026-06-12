# Integrate Analytix into a Next.js project (agent checklist)

Follow these steps in order. **Reference:** Bluemint + [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md).

---

## Phase 0 — Prerequisites

- [ ] Analytix platform is running (local `:3001` or production URL)
- [ ] A **Site** exists in dashboard; operator provides:
  - `ANALYTICS_SITE_ID` (UUID)
  - `NEXT_PUBLIC_ANALYTICS_SITE_KEY` (`sk_live_...`)
  - `ANALYTICS_API_SECRET` (`sk_secret_...`)
- [ ] Site **allowed_origins** includes consumer prod URL (e.g. `https://yoursite.netlify.app`)

---

## Phase 1 — Dependencies

### 1.1 `package.json`

```json
{
  "dependencies": {
    "@analytix/core": "^0.3.1",
    "@analytix/react": "^0.3.1"
  }
}
```

Add `@analytix/dashboard@^0.2.4` only if using embeddable admin UI.

### 1.2 `.npmrc` (optional)

```
@analytix:registry=https://registry.npmjs.org/
```

No `NPM_TOKEN` required for public npm install.

### 1.3 `next.config.ts`

```typescript
transpilePackages: ["@analytix/core", "@analytix/react"],
```

Add `"@analytix/dashboard"` if embedding dashboard.

### 1.4 Install

```bash
npm install
```

If install fails with `ETARGET` for `@analytix/*@^0.3.1`, the operator must publish from `analytics/` first (`npm run publish:packages`). See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## Phase 2 — Environment

```env
ANALYTICS_API_URL=http://localhost:3001
ANALYTICS_SITE_ID=
ANALYTICS_API_SECRET=
NEXT_PUBLIC_ANALYTICS_SITE_ID=
NEXT_PUBLIC_ANALYTICS_SITE_KEY=
```

Production: `ANALYTICS_API_URL=https://your-analytix.example.com`

See [ENV-VARS.md](./ENV-VARS.md).

---

## Phase 3 — Server config helper

Create `src/lib/analytix-config.ts`:

- `getAnalytixServerConfig()` — server routes; returns null if misconfigured
- `getAnalytixClientConfig()` — tracker; `collectUrl` defaults to `/api/analytics/collect`
- `isAnalytixEnabled()` — guard when site key missing

---

## Phase 4 — Client tracking

### 4.1 Loader + Root

**Server** `AnalytixLoader.tsx` — read config, render client root or null.

**Client** `AnalytixRoot.tsx`:

```tsx
import { AnalytixProvider, AnalytixTrackerNext } from "@analytix/react";
import { AnalytixConsentBridge } from "./AnalytixConsentBridge";

export default function AnalytixRoot({ config }: { config: AnalytixConfig }) {
  return (
    <AnalytixProvider config={config}>
      <AnalytixConsentBridge />
      <AnalytixTrackerNext getContentFromPath={...} />
    </AnalytixProvider>
  );
}
```

### 4.2 Root layout

Mount `<AnalytixLoader />` in `src/app/layout.tsx`.

### 4.3 Consent

If site has `consent_required: true`, `AnalytixConsentBridge` shows a banner and calls `grantConsent()` on accept. See Bluemint `AnalytixConsentBridge.tsx`.

---

## Phase 5 — API proxy routes

### 5.1 Collect

`src/app/api/analytics/collect/route.ts`

- Validate with `collectEventSchema` from `@analytix/core`
- Forward to `{ANALYTICS_API_URL}/api/v1/collect`
- Header: `X-Analytix-Site-Key`
- Optional: enrich `content_id` / slug from CMS

### 5.2 Config (recommended)

`src/app/api/analytics/config/route.ts` → platform `GET /api/v1/config`

### 5.3 Summary (admin)

`src/app/api/admin/analytics/route.ts`

- Admin auth required
- Header: `X-Analytix-Api-Secret`
- Forward to `/api/v1/sites/{siteId}/summary`
- Append `compare=1` for period deltas

### 5.4 Export (admin)

Proxy to `.../export`, stream CSV.

---

## Phase 6 — Admin UI

**Option A — Embeddable** (`@analytix/dashboard@^0.2.4`):

```tsx
import dynamic from "next/dynamic";
import "@analytix/dashboard/styles.css";

const AnalyticsDashboard = dynamic(
  () => import("@analytix/dashboard").then((m) => m.AnalyticsDashboard),
  { ssr: false, loading: () => <YourSkeleton /> }
);
```

**Option B — Custom (Bluemint):** fetch `/api/admin/analytics`, branded skeleton + charts.

---

## Phase 7 — Netlify / production

- [ ] All `ANALYTICS_*` env vars set (production platform URL)
- [ ] `SECRETS_SCAN_OMIT_KEYS` includes `NEXT_PUBLIC_ANALYTICS_SITE_KEY`, `NEXT_PUBLIC_ANALYTICS_SITE_ID`, `ANALYTICS_SITE_ID`
- [ ] `npm run build` passes locally
- [ ] **No `NPM_TOKEN`** needed for consumer install from npmjs

---

## Phase 8 — Verify

- [ ] Public pages POST `/api/analytics/collect` → 200
- [ ] Admin analytics loads metrics
- [ ] Platform `/dashboard` shows same site data
- [ ] No `api_secret` in browser Network tab

---

## Parameter mapping (summary API)

| Query param | Values | Notes |
|-------------|--------|-------|
| `range` | `24h`, `7d`, `30d`, `90d` | Date window |
| `granularity` | `hour`, `day` | Chart buckets |
| `compare` | `1` | Include `previous_period` |
| `scope` | `all`, `page`, `blog`, `article` | Traffic filter |
| `path` | e.g. `/blog` | With `scope=page` |
| `contentId` | UUID | With `scope=article` |

Map legacy `postId` → `contentId` in proxy.
