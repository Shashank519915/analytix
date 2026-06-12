# Analytix product roadmap — upgrade plan

Design direction for this product (from project skills):

| Skill | Application to Analytix |
|-------|-------------------------|
| **minimalist-ui** | Warm monochrome default, bento metric grids, crisp borders, editorial typography — **not** marketing-page fluff |
| **emil-design-eng** | Skeleton > spinners; no animation on filter chips (high frequency); `transform`/`opacity` only; loading states that match final layout |
| **design-taste-frontend** | **Dashboard = high density (7–8/10)**; read as B2B analytics for operators; avoid AI-purple gradient defaults |
| **brandkit** | Per-site / per-consumer **theme tokens** (accent, surface, chart palette) |
| **high-end-visual-design** | Use sparingly — subtle depth on cards, not cinematic marketing motion |

**Design read:** B2B analytics cockpit for site operators, minimalist-utilitarian language, modular widgets + configurable collection, dark mode as first-class theme.

---

## Current state (summary)

| Layer | Strength | Gap |
|-------|----------|-----|
| **Backend** | Rich summary, channels, UTM term/content, collection profiles | Rollups unused; custom events not aggregated; no summary cache |
| **Platform UI** | Auth, sites, settings, embed dashboard | Generic styling — needs editorial shell (minimalist-ui); no sidebar IA |
| **Dashboard package** | Full widgets, skeleton, dark mode, widget toggles | Drill-down filters, % of total, sticky toolbar |
| **React SDK** | page_view, engagement, remote config, consent hook | No plugin API; no offline queue; Next-coupled tracker |
| **Distribution** | npmjs `@analytix/*` (from 0.2.2) | GitHub `@Shashank519915/*` deprecated |

---

## Inspiration: [DavidWells/analytics](https://github.com/DavidWells/analytics)

Lightweight **plugin-based** analytics abstraction — not a backend replacement. Ideas worth adopting into Analytix SDK + platform:

| DavidWells concept | Analytix adaptation | Target phase |
|--------------------|---------------------|--------------|
| `page` / `track` / `identify` API | Unified client API on `@analytix/core` | Phase 4 |
| **Plugin system** + lifecycle hooks | `AnalytixPlugin` — `page`, `track`, `loaded`, `bootstrap` | Phase 4 |
| Event **queue** + offline flush | IndexedDB queue, retry on `online` | Phase 4 |
| **Debug mode** | `debug: true` → structured console + dev overlay | Phase 4 |
| `plugins.enable` / `disable` | Maps to site `enabled_events` + runtime toggles | Phase 2 ✓ (server); Phase 4 (client) |
| **Do-not-track** / consent | `consent_required` + `grantConsent()` | Phase 2 ✓ |
| **Original source** (first-touch UTM) | Persist first campaign in session storage → metadata | Phase 5 |
| **Scroll** utils | `scroll_depth` event at 25/50/75/100% | Phase 5 |
| **Redact** utils | Field redaction before collect | Phase 5 |
| **Script tag** / unpkg snippet | `@analytix/tracker` IIFE bundle | Phase 4 |
| `identify` + traits | Optional `visitor_traits` JSONB (no PII by default) | Phase 6 |
| Storage abstraction | Pluggable localStorage / cookie prefix | Phase 4 |

**Not adopting:** multi-vendor fan-out (GA, Segment, etc.) — Analytix *is* the backend. Plugin pattern targets **extensions** (redaction, enrichment, debug), not third-party tools.

---

## North star

**“Operators choose what to collect and what to see — production-grade, privacy-aware, fast at scale.”**

Three configurable layers:

1. **Collection profile** — what the SDK sends (events, fields, sampling)
2. **Site analytics config** — exclusions, retention, goals (stored on platform)
3. **Dashboard layout** — which widgets/metrics appear (platform + embed package)

---

# Part A — Backend & logic upgrades

## A1. Site configuration model (freedom to choose analytics)

Extend `sites` (or new `site_analytics_config` JSONB):

| Setting | Type | Purpose |
|---------|------|---------|
| `collection_profile` | enum | `minimal` \| `standard` \| `full` \| `custom` |
| `enabled_events` | string[] | `page_view`, `engagement`, `scroll_depth`, `outbound_click`, `custom` |
| `enabled_fields` | string[] | `geo`, `utm`, `device`, `performance`, `content` |
| `sample_rate` | 0–1 | Reduce volume on high-traffic sites |
| `exclude_paths` | string[] | Already in schema — expose in UI |
| `exclude_ips_hash` | string[] | Block known bots/internal |
| `retention_days` | int | Already in schema |
| `allowed_origins` | string[] | Already in schema |
| `consent_required` | bool | SDK waits for consent signal |
| `dashboard_widgets` | string[] | Ordered widget IDs to show |
| `dashboard_theme` | JSON | `{ mode, accent, chartPalette }` |
| `goals` | JSON[] | `{ id, name, type, path\|event, value }` |

**API:** `PATCH /api/sites/:id`, `GET /api/sites/:id/config` for SDK bootstrap.

## A2. Collection profiles (presets)

| Profile | Collects |
|---------|----------|
| **minimal** | page_view only, no UTM/device |
| **standard** | page_view + engagement + device + referrer |
| **full** | + UTM, geo (headers), content, scroll depth |
| **custom** | operator toggles each flag |

SDK fetches public config from `GET /api/v1/sites/:key/config` (site key auth) or embed in `AnalytixProvider`.

## A3. Fix rollups & performance (production resilience)

| Task | Detail |
|------|--------|
| Fix rollup upsert | Correct `unique_visitors`, `sessions` on conflict |
| Read path | Use rollups for `granularity=day` queries; raw for hour/realtime |
| Hourly rollups table | Optional `analytics_hourly_rollups` |
| Backfill job | `npm run db:backfill-rollups` |
| Summary cache | Redis or `summary_cache` table, TTL 60s per site+filter hash |
| Rate limit cleanup | Cron delete old `analytics_rate_limits` rows |
| Index review | Partial index on `event_type`, `WHERE NOT internal` |

## A4. Custom events & goals

| Feature | Backend |
|---------|---------|
| Custom event registry | `site_custom_events` table (name, schema) |
| Aggregation | `custom_event_counts` daily rollup |
| Goals | `goal_completions` computed on ingest or batch |
| Funnels (v2) | `funnel_definitions` + step completion query |

## A5. Enhanced metrics (new computations)

| Metric | Logic |
|--------|-------|
| **Channels** | Group referrer into Organic / Direct / Social / Email / Paid |
| **Entry/exit pages** | First/last path per session |
| **Scroll depth** | New event `scroll_depth` with `metadata.percent` |
| **Outbound clicks** | `outbound_click` with `metadata.href` |
| **Core Web Vitals** | Optional `web_vital` event (LCP, INP, CLS) |
| **404 tracking** | `page_view` + `metadata.is_404` |
| **Search terms** | Parse `?q=` / `?s=` from path or metadata |
| **utm_term/content** | Add to summary breakdowns (already collected) |
| **Cohort retention** | Weekly return rate (v2) |
| **Compare arbitrary periods** | API `compareFrom` / `compareTo` |

## A6. Export & data access

| Export | Content |
|--------|---------|
| Summary CSV (current) | Expand all breakdown columns |
| Raw events CSV | Paginated, date range, admin only |
| JSON API | Same as summary for programmatic use |
| Webhooks | POST on daily rollup complete (v2) |

## A7. Auth, security, ops

| Item | Detail |
|------|--------|
| Auth rate limiting | Login/register |
| Password reset | Email flow |
| API key scopes | Read-only vs ingest keys |
| Audit log | Site settings changes |
| Health endpoint | `/api/health` + DB ping |
| Structured logging | Collect errors, slow queries |
| Tests | core validation, summary SQL, collect route |

---

# Part B — React SDK upgrades

## B1. Framework-agnostic core

| Package | Purpose |
|---------|---------|
| `@analytix/core` | Already has types — add `createTracker()` vanilla JS |
| `@analytix/react` | Thin wrapper; optional `@analytix/next` for `usePathname` |

## B2. Configurable collection (matches site profile)

```typescript
AnalytixProvider config={{
  siteKey,
  collectUrl,
  profile: 'standard', // or fetch from platform
  consent: { required: true, onConsent: () => ... },
  trackScrollDepth: [25, 50, 75, 100],
  trackOutbound: true,
  trackWebVitals: true,
  sampleRate: 1,
}}
```

## B3. Reliability

| Feature | Detail |
|---------|--------|
| Offline queue | `localStorage` retry queue |
| `sendBeacon` fallback | On page unload |
| Idempotency | Client event UUID |
| DNT / consent gating | No-op until allowed |
| Debug mode | `?analytix_debug=1` console logs |

## B4. SPA support

- History API hooks for non-Next routers
- `@analytix/react-router` adapter (future)

---

# Part C — Dashboard UI (`@analytix/dashboard`)

## C1. Theming system

CSS variables (consumer-overridable):

```css
.analytix-dash {
  --ax-bg, --ax-surface, --ax-border, --ax-text, --ax-muted;
  --ax-accent, --ax-accent-muted;
  --ax-chart-1, --ax-chart-2, --ax-success, --ax-danger;
  --ax-radius, --ax-font;
}
```

**Props:**

```typescript
theme?: 'light' | 'dark' | 'system';
colors?: { accent?: string; surface?: string };
className?: string;
```

**Platform + embed:** Toggle in dashboard toolbar; persist in `localStorage` + optional site default from config.

Design: warm bone light (`#F7F6F3`), charcoal dark (`#111` / `#1a1a1a`) — minimalist-ui aligned.

## C2. Skeleton loading (emil-design-eng)

| State | UI |
|-------|-----|
| Initial load | Full dashboard skeleton matching bento layout (metrics + chart + 4 panels) |
| Filter change | Shimmer on chart + KPI values only (keep chrome) |
| Empty site | Illustration + “No data yet — add tracker to your site” + snippet CTA |
| Error | Retry button + message |
| Export | Disabled + spinner on button |

Export `AnalyticsDashboardSkeleton` from package for consumers (Bluemint already has local skeleton — unify API).

## C3. Layout — modular widgets

Replace fixed layout with **widget registry**:

| Widget ID | Data source | Default |
|-----------|-------------|---------|
| `kpi-overview` | summary totals | on |
| `realtime-strip` | realtime_visitors | on |
| `traffic-chart` | buckets | on |
| `top-paths` | top_paths | on |
| `top-content` | top_content | on |
| `landing-pages` | landing_pages | off |
| `referrers` | referrer_breakdown | on |
| `utm-sources` | utm_source_breakdown | off |
| `utm-campaigns` | utm_campaign_breakdown | off |
| `devices` | device_breakdown | on |
| `browsers` | browser_breakdown | on |
| `os` | os_breakdown | off |
| `countries` | country_breakdown | off |
| `regions` | region_breakdown | off |
| `languages` | language_breakdown | off |
| `new-returning` | new/returning | off |
| `sessions-detail` | pages_per_session, bounce | off |

**UI:** “Customize dashboard” drawer — toggle widgets, drag reorder (v2).

## C4. Filters UX upgrade

| Control | Improvement |
|---------|-------------|
| Date range | Presets + **custom date picker** (`from`/`to`) |
| Compare | Toggle + optional second range |
| Scope | Keep chips; add path autocomplete from `top_paths` |
| Blog/article | Content picker from `top_content` |
| Granularity | Auto-suggest (24h → hour, 90d → day) |
| Saved views | Save filter combo as named view (localStorage → API v2) |
| URL sync | Query params reflect filters (shareable links) |

**Motion:** No transition on chip click (high frequency). Chart crossfade 200ms ease-out only.

## C5. Chart improvements

| Item | Detail |
|------|--------|
| ResponsiveContainer | Fixed parent height + `width="100%" height="100%"` |
| Empty chart | Inline message, not broken Recharts |
| Tooltip | Rich tooltip (views, uniques, delta) |
| Drill-down | Click bucket → narrow range (v2) |
| Multiple series toggle | Views / uniques / sessions |
| Accessible | `role="img"` + summary table fallback |

## C6. KPI cards

Show configurable set (operator picks):

- Page views, uniques, sessions, bounce, engagement, pages/session
- New / returning split
- Admin traffic (muted card, excluded from main totals)
- Period delta badges (already have `Delta` component)

Grid: CSS `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))` — fixes 5-card wrap.

## C7. Realtime

| v1 | v2 |
|----|-----|
| Poll summary every 30s when tab visible | SSE stream |
| Animated count on change | Live “active pages” list |

---

# Part D — Platform UI (`apps/web`)

## D1. Information architecture

```
/dashboard
  /sites/new
  /sites/[id]
    /settings      ← edit origins, exclude paths, retention, collection profile
    /analytics     ← dashboard (default tab)
    /integrations  ← snippet, env vars, test connection
    /keys          ← rotate, copy
```

Shared layout: sidebar nav, account menu, consistent header.

## D2. Site settings UI

| Section | Fields |
|---------|--------|
| General | name, domain |
| Security | allowed origins, exclude paths |
| Data | retention days, sample rate |
| Collection | profile preset + advanced toggles |
| Dashboard | default theme, default widgets |
| Keys | site key, API secret, regenerate, copy buttons |

## D3. Integration wizard

Step-by-step for new sites:

1. Copy npm install + env vars
2. Paste layout snippet
3. “Send test event” button → confirms collect works
4. Link to live dashboard

## D4. Platform visual polish

- Apply minimalist-ui tokens to `globals.css`
- Sidebar + card hierarchy
- Form validation states
- Toast notifications (site created, keys copied)
- Mobile: collapsible sidebar

---

# Part E — Consumer integration (Bluemint pattern)

Bluemint keeps **custom dashboard**; platform package gets **generic embed**.

| Option | When |
|--------|------|
| `@analytix/dashboard` + theme props | Quick integrations |
| Custom UI + proxy API | Branded sites (Bluemint) |
| Platform-only | No embed in consumer |

Shared: `loadingFallback`, `theme`, `widgets` props on embed package.

---

# Part F — Implementation phases (v2)

## Phase 1 — Dashboard & site settings ✅

- [x] Wire all `AnalyticsSummary` fields to dashboard widgets
- [x] Skeleton + dark mode + custom date range
- [x] `PATCH /api/sites/:id` + copy keys

## Phase 2 — Configurable analytics ✅

- [x] `analytics_config` JSONB + collection profiles
- [x] SDK config endpoint + enabled events/fields
- [x] Widget toggles + channels + expanded CSV

## Phase 2b — npmjs distribution ✅

- [x] `publishConfig.registry` → npmjs
- [x] Rename scope to `@analytix/*` (npm lowercase requirement)
- [x] Bluemint: `@analytix:registry` on npmjs, no GitHub token
- [x] Publish `@analytix/*` `0.2.2` to npmjs
- [x] Bluemint `package-lock.json` resolves npmjs tarballs
- [ ] Publish `@analytix/react@0.2.3` (consent + config-load race fix)
- [ ] Verify Netlify green after lockfile push

## Phase 3 — Platform shell UI (apps/web) ✅

**Goal:** Replace generic auth/sites UI with editorial B2B cockpit ([minimalist-ui](../bluemint/.agents/skills/minimalist-ui), [emil-design-eng](../bluemint/.agents/skills/emil-design-eng), [brandkit](../bluemint/.agents/skills/brandkit)).

**Scope:** Root platform only — **not** `@analytix/dashboard` embed (later).

- [x] Design tokens in `globals.css` (warm bone canvas `#F7F6F3`, charcoal text, crisp `#EAEAEA` borders)
- [x] App shell: sidebar nav (Sites, Account), consistent page header
- [x] Auth pages: login/register — editorial split layout, no gradient heroes
- [x] Sites list: bento cards, empty state, skeleton rows
- [x] Site detail: tabs — Analytics | Settings | Integration (snippet + env + test event)
- [x] Toast notifications (settings saved, keys copied)
- [x] Mobile: collapsible sidebar
- [x] Landing `/` for logged-out visitors (product one-pager, not marketing fluff)

## Phase 4 — SDK v2 (plugin architecture) ✅

Inspired by [DavidWells/analytics](https://github.com/DavidWells/analytics) lifecycle model.

- [x] `@analytix/core`: `createAnalytixClient()` with `page`, `track`, `identify`, `engagement`
- [x] `AnalytixPlugin` interface + lifecycle (`bootstrap`, `loaded`, `page`, `track`, `identify`)
- [x] Built-in **backend plugin** (POST collect + offline queue flush on `online`)
- [x] Offline queue (localStorage) + `flushQueue()`
- [x] `debug` mode via debug plugin
- [x] Scroll depth collection (when enabled in site config)
- [x] `@analytix/tracker` — `initAnalytix()` for vanilla JS / SPA
- [x] `@analytix/react`: thin wrapper; `AnalytixTrackerNext` + browser pathname fallback
- [x] Framework guides: [FRAMEWORK-GUIDES.md](../agents/FRAMEWORK-GUIDES.md)
- [ ] Optional devtools overlay (Phase 4b)
- [ ] Outbound click plugin (Phase 5)

## Phase 5 — Production hardening (partial ✅)

Shipped in 0.3.0 / platform pass:

- [x] Fail-closed SDK when remote config fails
- [x] Default allowed origins on site create; deny browser CORS when origins empty
- [x] Production JWT secret validation
- [x] Dashboard: chart empty state, fetch retry, widget-save feedback
- [x] Platform error boundaries; API secret not in client RSC props
- [x] Integration test event payload; Bluemint consent bridge + collect validation
- [ ] Fix rollups + day-granularity read path
- [ ] Summary cache (TTL 60s per site+filter hash)
- [ ] Custom events registry + aggregation
- [ ] Goals (page visit / custom event)
- [ ] Outbound click plugin
- [ ] First-touch attribution (original source)
- [ ] PII redaction layer (configurable field denylist)
- [ ] Auth rate limits + integration tests
- [ ] `schema_migrations` table + versioned migrate

## Phase 6 — Advanced product

- [ ] Funnels, cohorts, compare arbitrary periods
- [ ] Realtime SSE dashboard strip
- [ ] Webhooks + daily rollup notifications
- [ ] Teams / RBAC
- [ ] Core Web Vitals events
- [ ] OpenAPI public docs
- [ ] Optional `identify` + visitor traits (privacy-first)

---

## Phase 3 UI spec (platform shell)

Apply skills from `bluemint/.agents/skills/`:

| Skill | Platform application |
|-------|---------------------|
| **minimalist-ui** | Warm monochrome, bento site cards, 8–12px radius, no pill chips on large surfaces |
| **emil-design-eng** | Skeleton site list; no animation on high-frequency controls |
| **design-taste-frontend** | Operator density 6/10 on settings; analytics tab delegates to embed dashboard |
| **brandkit** | CSS vars: `--ax-canvas`, `--ax-ink`, `--ax-border`, `--ax-accent` |

**Information architecture:**

```
/                    → marketing-lite landing (logged out)
/login, /register
/dashboard           → sites bento grid
/dashboard/sites/new → create wizard
/dashboard/sites/[id]
  ├─ analytics (default) — embed @analytix/dashboard
  ├─ settings          — collection profile, keys, origins
  └─ integration       — npm install, snippet, test event, env checklist
```

---

# Part G — Granular UI checklist (dashboard package)

| Component | Upgrade |
|-----------|---------|
| Toolbar | Date range picker, compare toggle, export, theme toggle, customize widgets |
| Realtime strip | Pulsing dot, auto-refresh indicator |
| KPI row | Configurable metrics, skeleton bones per card |
| Main chart | Area + line, legend, empty state |
| Top paths | Click to filter, show % of total |
| Top content | Thumbnail optional, link to path |
| Referrers | Channel badges (organic/direct/social) |
| UTM panel | Tabbed source / medium / campaign |
| Geo panel | Table + simple bar (map v2) |
| Device/Browser/OS | Horizontal bar charts |
| Filters | Sticky on scroll, mobile drawer |
| Footer | “Last updated”, data range label |

---

# Part H — Granular logic checklist (backend)

| Area | Item |
|------|------|
| Ingest | Validate custom event names against registry |
| Ingest | Bot detection (UA + optional IP list) |
| Ingest | Consent flag in metadata → exclude if required |
| Query | Parameterized scope validation (zod) |
| Query | Max date range guard (e.g. 365 days raw) |
| Query | Pagination for top lists |
| Storage | Partition `analytics_events` by month (v2) |
| Privacy | IP hash only (already); optional salt per site |
| Privacy | GDPR delete visitor by fingerprint |
| Ops | Migration versioning (`schema_migrations` table) |

---

## What NOT to do (design skills)

- No marketing-style hero sections in dashboard
- No `transition: all` on filter chips
- No spinner-only loading (use skeleton)
- No hiding 50% of already-computed API data
- No dark mode as afterthought — design tokens from day one
- No forcing Bluemint-specific UI into the public package — keep embed generic + themeable

---

## Next step

**Immediate:** Publish `@analytix/core@0.3.0`, `@analytix/react@0.3.0`, `@analytix/tracker@0.3.0`, `@analytix/dashboard@0.2.3` — see [PRODUCTION-READINESS.md](../PRODUCTION-READINESS.md).

**Then:** Remaining Phase 5 (rollups, summary cache, outbound clicks, auth rate limits).
