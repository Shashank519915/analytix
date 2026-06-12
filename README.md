# Analytix

Multi-tenant, first-party analytics platform. Host separately and connect any website via npm packages.

## Monorepo layout

```
analytics/
  packages/
    core/        @analytix/core   — types, validation, IP/geo helpers, scope logic
    db/          @analytix/db     — Postgres schema, events, summaries, rollups
    react/       @analytix/react  — client tracker + React provider
    dashboard/   @analytix/dashboard — reusable analytics dashboard UI
  apps/
    web/         @analytix/web    — hosted platform (accounts, sites, API, dashboard)
  docs/
    INTEGRATION.md
```

## Quick start (platform)

```bash
cd analytics
cp .env.example .env.local
# Set DATABASE_URL and JWT_SECRET

npm install
npm run db:migrate -w @analytix/db
npm run build -w @analytix/core && npm run build -w @analytix/db
npm run db:seed -w @analytix/db
npm run dev
```

Open http://localhost:3001 → register/login → create a site → copy **site_key** and **api_secret**.

## Connect Bluemint (this repo)

In `bluemint/.env.local`:

```env
ANALYTICS_API_URL=http://localhost:3001
ANALYTICS_SITE_ID=<uuid from analytix dashboard>
ANALYTICS_API_SECRET=sk_secret_...
NEXT_PUBLIC_ANALYTICS_SITE_ID=<same uuid>
NEXT_PUBLIC_ANALYTICS_SITE_KEY=sk_live_...
```

Bluemint uses:
- `@analytix/react` for page tracking (via `/api/analytics/collect` proxy)
- `@analytix/dashboard` in admin analytics
- Server proxy routes for summary + CSV export

See [docs/INTEGRATION.md](./docs/INTEGRATION.md) for full handoff, publishing packages to GitHub, and multi-site setup.

## API overview

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/v1/collect` | `X-Analytix-Site-Key` | Ingest events (CORS-aware) |
| `GET /api/v1/sites/:id/summary` | Session cookie or `X-Analytix-Api-Secret` | Dashboard metrics |
| `GET /api/v1/sites/:id/export` | Same | CSV export |

## Features

- Multi-tenant accounts + sites
- Rate limiting + dedupe
- Daily rollups + retention purge
- Period comparison (`compare=1`)
- Realtime visitors (15 min)
- Full UTM + region breakdowns
- Embeddable dashboard package

## Publishing packages

Each package under `packages/*` can be published to GitHub Packages or npm:

```bash
cd packages/core && npm publish
```

Or keep as private git submodules and use `"@analytix/react": "file:../analytics/packages/react"` in consumer apps.
