# Analytix — guide for AI coding agents

You are integrating **Analytix**, a hosted first-party analytics platform. Read this folder before writing code.

## Start here

1. [OVERVIEW.md](./OVERVIEW.md) — mental model, components, decision tree
2. [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md) — step-by-step integration checklist
3. [FRAMEWORK-GUIDES.md](./FRAMEWORK-GUIDES.md) — SDK v2: Next.js, Vite, vanilla JS, plugins
4. [ENV-VARS.md](./ENV-VARS.md) — every env var, local vs production
5. [API-REFERENCE.md](./API-REFERENCE.md) — platform HTTP API
6. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — known failures and fixes
7. [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md) — Bluemint-style patterns

Operator setup (DB, deploy, seed): [../setup/PLATFORM-SETUP.md](../setup/PLATFORM-SETUP.md)

---

## Agent rules (read before coding)

### DO

- Use **separate** Analytix DB from the consumer app's CMS DB
- Store `api_secret` only in server env (`ANALYTICS_API_SECRET`) — never `NEXT_PUBLIC_*`
- Proxy collect + config + summary through consumer API routes (recommended)
- Install packages from `@analytix/*` on [npmjs](https://www.npmjs.com/org/analytix) — **no auth token** for public install
- Add `transpilePackages: ["@analytix/core", "@analytix/react"]` in consumer `next.config.ts`
- Use **`AnalytixTrackerNext`** (Next App Router) or **`AnalytixTracker`** (SPA / manual pathname)
- Validate collect proxy bodies with `collectEventSchema` from `@analytix/core`
- Wire **consent** when site has `consent_required` (see [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md))
- Set `ANALYTICS_API_URL` to the **hosted platform URL** in production (not `localhost`)
- Add `SECRETS_SCAN_OMIT_KEYS` for `NEXT_PUBLIC_ANALYTICS_SITE_KEY` on Netlify consumer deploys
- Keep server-only helpers in `lib/` (e.g. `parseSiteTab`) — never export utilities from `"use client"` files used by Server Components

### DO NOT

- Do not put `ANALYTICS_API_SECRET` in client code or `NEXT_PUBLIC_*`
- Do not point production `ANALYTICS_API_URL` at `localhost`
- Do not run `db:seed` env vars on Netlify — seed is local CLI only
- Do not skip building `@analytix/core` before `@analytix/db` on platform deploy
- Do not use `file:../analytics/...` deps in production consumer apps — use published npm packages
- Do not create analytics tables in the consumer app's database
- Do not use GitHub Packages / `NPM_TOKEN` for installing `@analytix/*` (legacy)

---

## Quick decision tree

```
User wants analytics on a Next.js site?
│
├─ Platform already hosted? (e.g. https://analytixneo.netlify.app)
│   └─ YES → Create/find Site in dashboard → copy keys → integrate consumer (INTEGRATE-NEXTJS.md)
│
├─ Platform not hosted yet?
│   └─ Operator runs PLATFORM-SETUP.md + DEPLOY-NETLIFY.md first
│
├─ Admin UI preference?
│   ├─ Generic → @analytix/dashboard (theme: light/dark/system, host CSS vars)
│   ├─ Custom branded → build UI calling /api/admin/analytics proxy (REFERENCE-IMPLEMENTATION.md)
│   └─ Central only → use platform /dashboard, skip embed
│
└─ Second website?
    └─ New Site in Analytix dashboard → new env keys → set allowed_origins for prod URL
```

---

## Published packages (npmjs)

| Package | Version | Purpose |
|---------|---------|---------|
| `@analytix/core` | **^0.3.1** | Types, validation, `createAnalytixClient()`, plugins |
| `@analytix/react` | **^0.3.1** | `AnalytixProvider`, `AnalytixTrackerNext`, hooks |
| `@analytix/tracker` | **^0.3.0** | Vanilla JS `initAnalytix()` / script tag |
| `@analytix/dashboard` | **^0.2.4** | Embeddable admin UI + `@analytix/dashboard/styles.css` |

See [PUBLISHING.md](../PUBLISHING.md) for publish workflow.

Platform-only (never publish to consumers):

- `@analytix/db` — Postgres layer
- `@analytix/web` — hosted app in `apps/web`

---

## Platform UI (for agents working in `analytics/apps/web`)

- Editorial shell: DM Sans + Instrument Serif, warm bone palette, bento sites grid
- Theme toggle: Light / Dark / System (`data-theme` on `<html>`)
- Site detail tabs: Analytics (embed dashboard) | Settings | Integration
- **Server/client rule:** tab parsing lives in `lib/site-tabs.ts`, not in client components
- Dashboard embed: `SiteAnalyticsSectionDynamic` with `ssr: false` + skeleton loading

---

## Example URLs (replace with yours)

| Service | URL |
|---------|-----|
| Platform | `https://analytixneo.netlify.app` |
| Consumer site | `https://bluemintservices.netlify.app` |

Store your real URLs in `docs/setup.local/MY-DEPLOYMENT.md` (gitignored).
