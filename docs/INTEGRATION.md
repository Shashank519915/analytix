# Analytix Integration Guide

How to host Analytix as a separate project and connect any website (including Bluemint).

---

## Architecture

```
┌─────────────────────┐     site_key (public)      ┌──────────────────────┐
│  Your website       │ ─────────────────────────► │  Analytix Platform   │
│  (Bluemint, etc.)   │     POST /api/v1/collect   │  analytics/apps/web  │
│                     │                            │  Own Neon database   │
│  @analytix/react    │ ◄───────────────────────── │                      │
└─────────────────────┘     api_secret (server)    └──────────────────────┘
         │                      summary/export
         │  optional proxy      │
         └─ /api/analytics/collect (Bluemint keeps view_count sync)
```

**Two keys per site:**

| Key | Visibility | Used for |
|-----|------------|----------|
| `site_key` (`sk_live_…`) | Public (client) | Sending page views / events |
| `api_secret` (`sk_secret_…`) | Server only | Reading analytics, CSV export |

Never expose `api_secret` in client bundles or `NEXT_PUBLIC_*` variables.

---

## 1. Deploy the Analytix platform

### Database

1. Create a **separate** Neon project for Analytix (do not share Bluemint's CMS database).
2. Set `DATABASE_URL` in `analytics/.env.local`.
3. Run migrations:

```bash
cd analytics
npm install
npm run build -w @analytix/core
npm run build -w @analytix/db
npm run db:migrate -w @analytix/db
npm run db:seed -w @analytix/db   # optional: creates admin + first site
```

### Host the app

Deploy `analytics/apps/web` to Vercel, Netlify, or any Node host.

Environment variables:

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes |
| `JWT_SECRET` | Yes (long random string) |
| `APP_URL` | Yes (e.g. `https://analytics.yourdomain.com`) |

Example Vercel setup:
- Root directory: `analytics/apps/web`
- Build: `cd ../.. && npm install && npm run build -w @analytix/web`
- Or deploy the whole monorepo with correct root.

---

## 2. Create an account and site

1. Open your Analytix URL → **Register**.
2. **Dashboard → New site**
   - Name: `BlueMint Services`
   - Domain: `bluemint.services`
   - Allowed origins: `https://bluemint.services`, `http://localhost:3000`
   - Exclude paths: `/admin*`, `/blog/preview*` (default)
3. Copy from the site detail page:
   - Site ID (UUID)
   - Site key
   - API secret

Regenerate keys anytime from the site settings page if compromised.

---

## 3. Connect a Next.js site (Bluemint)

### Install packages

In the consumer app's `package.json`:

```json
{
  "dependencies": {
    "@analytix/core": "file:../analytics/packages/core",
    "@analytix/react": "file:../analytics/packages/react",
    "@analytix/dashboard": "file:../analytics/packages/dashboard"
  }
}
```

For published packages (GitHub/npm):

```json
"@analytix/react": "github:your-org/analytix#main&path:packages/react"
```

### Environment variables

```env
# Server — never NEXT_PUBLIC_
ANALYTICS_API_URL=https://analytics.yourdomain.com
ANALYTICS_SITE_ID=<uuid>
ANALYTICS_API_SECRET=sk_secret_...

# Client — site key only
NEXT_PUBLIC_ANALYTICS_SITE_ID=<uuid>
NEXT_PUBLIC_ANALYTICS_SITE_KEY=sk_live_...
```

### Client tracking

```tsx
// app/layout.tsx
import AnalytixLoader from "@/components/analytics/AnalytixLoader";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <AnalytixLoader />
      </body>
    </html>
  );
}
```

`AnalytixLoader` reads config from env and mounts `@analytix/react`.

**Collect URL options:**

| Mode | `NEXT_PUBLIC_ANALYTICS_COLLECT_URL` | Notes |
|------|-------------------------------------|-------|
| Proxy (recommended) | `/api/analytics/collect` | Site-specific logic (e.g. view_count) runs in your app |
| Direct | `https://analytics.yourdomain.com/api/v1/collect` | Simplest; no server proxy |

Bluemint uses the **proxy** so blog `view_count` stays in the CMS database.

### Admin dashboard embed

```tsx
import { AnalyticsDashboard } from "@analytix/dashboard";
import "@analytix/dashboard/styles.css";

<AnalyticsDashboard
  siteId={process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID!}
  summaryEndpoint="/api/admin/analytics"
  exportEndpoint="/api/admin/analytics/export"
/>
```

Server proxy example (`/api/admin/analytics`):

```typescript
const res = await fetch(
  `${process.env.ANALYTICS_API_URL}/api/v1/sites/${process.env.ANALYTICS_SITE_ID}/summary?${params}`,
  { headers: { "X-Analytix-Api-Secret": process.env.ANALYTICS_API_SECRET! } }
);
return NextResponse.json(await res.json());
```

Bluemint ships this proxy pre-wired.

---

## 4. Connect a non-Next.js site

Use the collect API directly:

```javascript
fetch("https://analytics.yourdomain.com/api/v1/collect", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Analytix-Site-Key": "sk_live_...",
  },
  body: JSON.stringify({
    event_type: "page_view",
    path: window.location.pathname,
    session_id: "...",
    visitor_fingerprint: "...",
    referrer: document.referrer,
    user_agent: navigator.userAgent,
    metadata: { page_title: document.title },
  }),
  keepalive: true,
});
```

Add your origin to the site's **allowed_origins** in Analytix.

For SPA tracking, call on every route change (React Router, Vue Router, etc.).

---

## 5. Publishing packages to GitHub

### Option A — Monorepo (recommended)

1. Create repo `your-org/analytix` with this folder.
2. Consumer apps use `file:../analytics/packages/react` during dev.
3. CI publishes packages on tag:

```bash
npm publish -w @analytix/core --access restricted
```

### Option B — GitHub Packages

In each `packages/*/package.json`:

```json
{
  "name": "@your-org/analytix-react",
  "publishConfig": { "registry": "https://npm.pkg.github.com" }
}
```

Consumers add `.npmrc`:

```
@your-org:registry=https://npm.pkg.github.com
```

### Option C — Private npm

Publish to npm private scope; consumers `npm install @your-org/analytix-react`.

---

## 6. Multi-site (agency use)

One Analytix account → many sites:

| Site | Domain | site_key | api_secret |
|------|--------|----------|------------|
| Bluemint | bluemint.services | sk_live_aaa | sk_secret_aaa |
| Client B | clientb.com | sk_live_bbb | sk_secret_bbb |

Each consumer app gets its own env vars. Data is isolated by `site_id` in the database.

View all sites at `https://analytics.yourdomain.com/dashboard`.

---

## 7. Migrating from Bluemint embedded analytics

Bluemint previously stored events in its own `analytics_events` table. After switching:

1. Deploy Analytix and create a Bluemint site.
2. Set Bluemint env vars (section 3).
3. Old events remain in Bluemint DB but are no longer queried.
4. Optional: one-time SQL export/import script if historical data must be preserved (map `post_id` → `content_id`, add `site_id`).

New events flow only through Analytix.

---

## 8. API reference

### POST `/api/v1/collect`

Headers: `X-Analytix-Site-Key`, `Origin` (must match allowed_origins if configured)

Body: see `@analytix/core` `collectEventSchema`

### GET `/api/v1/sites/:id/summary`

Query: `range` (24h|7d|30d|90d), `from`, `to`, `granularity`, `scope`, `path`, `contentId`, `includeBlogArticles`, `compare=1`

Auth: `X-Analytix-Api-Secret: sk_secret_...` or logged-in session owning the site

### GET `/api/v1/sites/:id/export`

Same query params and auth → CSV download

---

## 9. Local development (both projects)

Terminal 1 — Analytix:

```bash
cd analytics && npm run dev    # :3001
```

Terminal 2 — Bluemint:

```bash
cd bluemint && npm run dev     # :3000
```

Ensure Bluemint `allowed_origins` includes `http://localhost:3000`.

---

## 10. Security checklist

- [ ] Separate Neon DB for Analytix
- [ ] Strong `JWT_SECRET` and admin passwords
- [ ] `api_secret` only in server env
- [ ] `allowed_origins` configured per site (not `*` in production)
- [ ] Rotate keys if leaked
- [ ] HTTPS on both platform and consumer sites
