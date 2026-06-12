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

Each consumer is one **Site** in Analytix with unique keys.

---

## Credentials model

| Credential | Format | Where it lives | Used for |
|------------|--------|----------------|----------|
| Site ID | UUID | Server + `NEXT_PUBLIC_*` | Identify which site's data |
| Site key | `sk_live_...` | `NEXT_PUBLIC_ANALYTICS_SITE_KEY` | Send events (client → proxy → collect) |
| API secret | `sk_secret_...` | `ANALYTICS_API_SECRET` (server only) | Read summary, export CSV |

**Who creates credentials:** The operator (human), via `npm run db:seed` or Analytix dashboard → Create site.

**Who consumes credentials:** The consumer app's env vars. Visitors never see secrets.

---

## Three integration layers

### Layer 1 — Platform (operator)

- Repo: `analytics/`
- Deploy: `apps/web` to Netlify/Vercel
- Docs: [../setup/PLATFORM-SETUP.md](../setup/PLATFORM-SETUP.md)

### Layer 2 — npm packages (consumer install)

- `@YOUR_GITHUB_USERNAME/analytix-react` — tracking in layout
- `@YOUR_GITHUB_USERNAME/analytix-dashboard` — optional generic admin UI
- Published via GitHub Packages ([../PUBLISHING.md](../PUBLISHING.md))

### Layer 3 — Consumer app wiring

Typical files to create/modify:

```
src/lib/analytix-config.ts
src/components/analytics/AnalytixLoader.tsx
src/app/api/analytics/collect/route.ts
src/app/api/admin/analytics/route.ts
src/app/api/admin/analytics/export/route.ts
src/app/admin/.../analytics/page.tsx
src/app/layout.tsx                    # mount AnalytixLoader
next.config.ts                        # transpilePackages
.env.example                          # document env vars
.netlify.toml or netlify env          # NPM_TOKEN, SECRETS_SCAN_OMIT_KEYS
```

---

## Data flow

### Page view (tracking)

```
1. Browser loads page
2. @analytix/react AnalytixTracker fires
3. POST /api/analytics/collect  (consumer proxy)
4. POST /api/v1/collect         (platform, header X-Analytix-Site-Key)
5. Row inserted in analytics_events (platform DB)
```

### Admin dashboard

```
1. Admin opens /admin/analytics
2. UI fetches GET /api/admin/analytics?range=7d&...
3. Proxy forwards to GET /api/v1/sites/:id/summary (header X-Analytix-Api-Secret)
4. JSON returned → charts render
```

---

## UI options for admin analytics

| Approach | Pros | Cons |
|----------|------|------|
| `@analytix/dashboard` package | Fast, 3 lines | Generic styling, fewer cards |
| Custom dashboard (Bluemint) | Branded, rich filters, skeleton | More code to maintain |
| Platform `/dashboard` only | Zero embed code | Leave consumer admin |

See [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md) for custom vs embeddable dashboard patterns.

---

## Multi-tenant / multi-project

- One platform hosts **many sites**
- Each consumer project = one Site + its own env keys
- Data is isolated by `site_id` in platform DB
- Do not reuse the same site keys across unrelated production apps unless intentional

---

## When to read other docs

| Task | Doc |
|------|-----|
| Integrate Next.js site | [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md) |
| Env var reference | [ENV-VARS.md](./ENV-VARS.md) |
| HTTP API details | [API-REFERENCE.md](./API-REFERENCE.md) |
| Build/deploy errors | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Operator setup | [../setup/PLATFORM-SETUP.md](../setup/PLATFORM-SETUP.md) |
