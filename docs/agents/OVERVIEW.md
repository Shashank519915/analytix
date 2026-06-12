# Analytix overview (for agents)

## What Analytix is

Analytix is a **hosted analytics platform** plus **npm packages** for client sites.

```
                    ┌─────────────────────────────┐
                    │   Analytix Platform         │
                    │   apps/web @ Netlify        │
                    │   Own Postgres (Neon)       │
                    │                             │
                    │   • POST /api/v1/collect    │
                    │   • GET  /api/v1/config     │
                    │   • GET  .../summary        │
                    │   • GET  .../export         │
                    │   • /dashboard UI           │
                    └──────────────┬──────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
    ┌─────▼─────┐           ┌──────▼──────┐         ┌──────▼──────┐
    │ Bluemint  │           │  Site B     │         │  Site C     │
    │ consumer  │           │  consumer   │         │  consumer   │
    └───────────┘           └─────────────┘         └─────────────┘
```

Each consumer is one **Site** in Analytix with unique keys and **allowed_origins**.

---

## Credentials model

| Credential | Format | Where it lives | Used for |
|------------|--------|----------------|----------|
| Site ID | UUID | Server + optional `NEXT_PUBLIC_*` | Identify which site's data |
| Site key | `sk_live_...` | `NEXT_PUBLIC_ANALYTICS_SITE_KEY` | Send events (client → proxy → collect) |
| API secret | `sk_secret_...` | `ANALYTICS_API_SECRET` (server only) | Read summary, export CSV |

**Who creates credentials:** Operator via Analytix dashboard → Create site, or `npm run db:seed` locally.

**Who consumes credentials:** Consumer app env vars. Visitors never see secrets.

---

## Three integration layers

### Layer 1 — Platform (operator)

- Repo: `analytics/`
- Deploy: `apps/web` to Netlify
- Docs: [../setup/PLATFORM-SETUP.md](../setup/PLATFORM-SETUP.md)
- UI: sites bento, site tabs, `@analytix/dashboard` embed on Analytics tab

### Layer 2 — npm packages (consumer install)

| Package | Role |
|---------|------|
| `@analytix/core` | Client SDK, validation, types |
| `@analytix/react` | React provider + trackers |
| `@analytix/dashboard` | Optional embeddable charts |
| `@analytix/tracker` | Vanilla JS entry |

Published on **npmjs** ([../PUBLISHING.md](../PUBLISHING.md)) — not GitHub Packages.

### Layer 3 — Consumer app wiring

Typical files (Next.js App Router):

```
src/lib/analytix-config.ts
src/components/analytics/AnalytixLoader.tsx      # server
src/components/analytics/AnalytixRoot.tsx       # client provider + tracker
src/components/analytics/AnalytixConsentBridge.tsx  # if consent_required
src/app/api/analytics/collect/route.ts          # proxy + optional enrichment
src/app/api/analytics/config/route.ts           # optional config proxy
src/app/api/admin/analytics/route.ts            # summary proxy (admin auth)
src/app/layout.tsx                              # mount AnalytixLoader
next.config.ts                                  # transpilePackages
.npmrc                                          # @analytix:registry=https://registry.npmjs.org/
```

---

## Data flow

### Page view (tracking)

```
1. Browser loads page
2. @analytix/react AnalytixTrackerNext fires (after config + consent if required)
3. POST /api/analytics/collect  (consumer proxy, validated with collectEventSchema)
4. POST /api/v1/collect         (platform, header X-Analytix-Site-Key)
5. Row inserted in analytics_events (platform DB)
```

### Remote config (SDK v2)

```
1. AnalytixProvider fetches GET /api/analytics/config (or direct /api/v1/config)
2. Applies collection profile, exclude_paths, consent_required, enabled_events
3. If config fetch fails → tracking stays off (fail closed)
```

### Admin dashboard

```
1. Admin opens /admin/analytics
2. UI fetches GET /api/admin/analytics?range=7d&...
3. Proxy forwards to GET /api/v1/sites/:id/summary (header X-Analytix-Api-Secret)
4. JSON returned → charts render (custom UI or @analytix/dashboard)
```

---

## UI options for admin analytics

| Approach | Pros | Cons |
|----------|------|------|
| `@analytix/dashboard` | Fast, theme toggle, host CSS vars | Generic styling |
| Custom dashboard (Bluemint) | Branded, rich filters, skeleton | More code |
| Platform `/dashboard` only | Zero embed code | Leave consumer admin |

---

## Multi-tenant / multi-project

- One platform hosts **many sites**
- Each consumer project = one Site + its own env keys
- Data isolated by `site_id` in platform DB
- **allowed_origins** must include production URL (e.g. `https://yoursite.netlify.app`)

---

## When to read other docs

| Task | Doc |
|------|-----|
| Integrate Next.js site | [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md) |
| SDK v2 / plugins / vanilla JS | [FRAMEWORK-GUIDES.md](./FRAMEWORK-GUIDES.md) |
| Env var reference | [ENV-VARS.md](./ENV-VARS.md) |
| HTTP API details | [API-REFERENCE.md](./API-REFERENCE.md) |
| Build/deploy errors | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Bluemint patterns | [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md) |
| Operator setup | [../setup/PLATFORM-SETUP.md](../setup/PLATFORM-SETUP.md) |
