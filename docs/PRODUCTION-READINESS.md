# Production readiness — pre-publish scan

Last scan: June 2026 (before `@analytix/core` / `@analytix/react` **0.3.1** and `@analytix/dashboard` **0.2.4** publish).

## Skeleton loading (confirmed)

Skeletons are **not removed**. Two layers on the site analytics tab:

1. **Chunk load** — `SiteAnalyticsSectionDynamic` shows `AnalyticsDashboardSkeleton` while the client bundle loads (`ssr: false`).
2. **Data fetch** — `SiteAnalyticsSection` passes `loadingFallback={<AnalyticsDashboardSkeleton />}` to `AnalyticsDashboard` while the summary API loads.

Also: sites bento skeleton, login Suspense skeleton, Bluemint admin `AnalyticsSkeleton`.

## Fixes applied in this pass

| Area | Fix |
|------|-----|
| App shell | Flex layout (sidebar no longer hides main content) |
| Site page 500 | Client-only dashboard load; date serialization |
| Integration test | Valid collect payload (`session_id`, `visitor_fingerprint`) |
| SDK config | Fail closed when config fetch fails (no silent tracking) |
| CORS / origins | Empty `allowed_origins` denies browser requests; new sites default to `https://{domain}` |
| Collect API | CORS headers on all responses after site key resolution |
| JWT | Production rejects placeholder / weak `JWT_SECRET` |
| Dashboard | Chart empty state, error retry, widget-save toasts |
| Secrets | `api_secret` fetched on demand in Settings (not in RSC props) |
| Errors | `error.tsx`, `not-found.tsx`, dashboard `error.tsx` |
| Dashboard CSS | `@analytix/dashboard/styles.css` resolves from `src/` (no build required for styles in monorepo) |
| Bluemint | Consent bridge + collect proxy validates with `collectEventSchema` |
| Dev workflow | Root `npm run dev` runs `build:packages` first |

## Package versions

| Package | Version | Notes |
|---------|---------|-------|
| `@analytix/core` | **0.3.1** | Origins helpers, fail-closed SDK |
| `@analytix/react` | **0.3.1** | Matches core |
| `@analytix/tracker` | 0.3.0 | Unchanged |
| `@analytix/dashboard` | **0.2.4** | Theme hook, CSS tokens |

## Deferred (Phase 5+ — post-launch)

- Rollups read path + summary cache (TTL)
- Outbound click plugin
- Custom events registry, goals, first-touch attribution
- Auth rate limits + integration test suite
- `schema_migrations` table
- Optional devtools overlay (Phase 4b)
- Phase 6: funnels, RBAC, SSE, OpenAPI

## Pre-deploy checklist

### Analytix platform (Netlify)

- [ ] `DATABASE_URL`, `JWT_SECRET` (32+ chars, **not** placeholder), `APP_URL=https://analytixneo.netlify.app`
- [ ] Run DB migrations: `npm run db:migrate`
- [ ] Backfill origins (if any site shows 0 origins): `npm run db:backfill-origins`
- [ ] Redeploy after env + code push

**Origins backfill (June 2026):** Ran `npm run db:backfill-origins` — BlueMint Services already had 4 origins (`localhost:3000/3002`, `https/http://bluemintservices.netlify.app`). New sites auto-default via `buildDefaultAllowedOrigins()`.

### npm publish

```powershell
cd analytics
npm run build:packages
npm run publish:packages
```

### Bluemint

- [ ] Bump `@analytix/core` + `@analytix/react` to `^0.3.1`, run `npm install` **after** npm publish
- [ ] `ANALYTIX_*` env vars set on Netlify
- [ ] Redeploy

### Smoke test

- [ ] `/dashboard` — sidebar + sites grid visible
- [ ] Site detail → Analytics tab — skeleton → charts (or empty state)
- [ ] Integration tab → Send test event → success toast
- [ ] Bluemint public site — page views in dashboard within ~1 min

## Known limitations

- Custom date range in dashboard uses UTC midnight for `<input type="date">` values
- `view_count` on Bluemint posts is a local cache; Analytix is source of truth for period analytics
- Auth login/register not rate-limited yet (collect is)
