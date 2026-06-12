# Reference implementation patterns

Production-quality Analytix consumer integration. **Bluemint** (`bluemint/`) is the live reference.

---

## Integration styles

| Style | When to use |
|-------|-------------|
| **Custom admin dashboard** | Branded UI, blog filters, skeleton, extra cards (Bluemint) |
| **Embeddable package** | Fast setup — `@analytix/dashboard@^0.2.4` |
| **Platform UI only** | Link admins to `{APP_URL}/dashboard` |

---

## Bluemint file map (verified)

| File | Role |
|------|------|
| `src/lib/analytix-config.ts` | `getAnalytixServerConfig()`, `getAnalytixClientConfig()` |
| `src/components/analytics/AnalytixLoader.tsx` | Server wrapper; passes config to client root |
| `src/components/analytics/AnalytixRoot.tsx` | `AnalytixProvider` + `AnalytixConsentBridge` + `AnalytixTrackerNext` |
| `src/components/analytics/AnalytixConsentBridge.tsx` | Auto-grant or banner when `consent_required` |
| `src/app/layout.tsx` | Mount `<AnalytixLoader />` |
| `src/app/api/analytics/collect/route.ts` | Collect proxy + `collectEventSchema` + blog `content_id` enrichment |
| `src/app/api/analytics/config/route.ts` | Public config proxy |
| `src/app/api/admin/analytics/route.ts` | Summary proxy (admin auth) |
| `src/app/api/admin/analytics/export/route.ts` | CSV proxy |
| `src/app/admin/(panel)/analytics/` | Custom dashboard UI |
| `next.config.ts` | `transpilePackages: ["@analytix/core", "@analytix/react"]` |
| `.npmrc` | `@analytix:registry=https://registry.npmjs.org/` |
| `package.json` | `@analytix/core` + `@analytix/react` **^0.3.1** |

---

## Client root (Next.js App Router)

```tsx
// AnalytixRoot.tsx — client component
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

Use **`AnalytixTrackerNext`** in App Router (uses `usePathname`). Do not use bare `AnalytixTracker` without passing `pathname`.

---

## Collect proxy pattern

```typescript
import { collectEventSchema } from "@analytix/core";

const body = collectEventSchema.parse(await request.json());

const upstream = await fetch(`${config.apiUrl}/api/v1/collect`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Analytix-Site-Key": config.siteKey,
  },
  body: JSON.stringify(body),
});
```

Validate before proxying. Enrich CMS fields (e.g. `content_id` from blog slug) server-side.

---

## Summary proxy adapters

Platform returns `top_content`; legacy UIs may expect `top_posts`:

```typescript
top_posts: (summary.top_content ?? []).map((row) => ({
  post_id: row.content_id,
  post_slug: row.content_slug,
  post_title: row.content_title,
  views: row.views,
})),
```

Map query param `postId` → `contentId` when forwarding to platform.

Append `compare=1` for period deltas unless the UI opts out.

---

## Embeddable dashboard

```tsx
import dynamic from "next/dynamic";
import "@analytix/dashboard/styles.css";

const AnalyticsDashboard = dynamic(
  () => import("@analytix/dashboard").then((m) => m.AnalyticsDashboard),
  { ssr: false, loading: () => <YourSkeleton /> }
);

<AnalyticsDashboard
  siteId={siteId}
  summaryEndpoint="/api/admin/analytics"
  exportEndpoint="/api/admin/analytics/export"
  defaultTheme="light"
  loadingFallback={<YourSkeleton />}
/>
```

**Theme:** cycles Light → Dark → System; persisted per site in `localStorage`.

**Host styling:** override on a wrapper:

```css
.myAnalytics {
  --analytix-dash-ink: #111;
  --analytix-dash-accent: #111;
  --analytix-dash-surface: #fff;
}
```

---

## Agent workflow

1. [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md) — checklist
2. Implement proxy routes + `AnalytixRoot` + consent
3. Choose dashboard style (custom vs embed)
4. Set **allowed_origins** on Analytix site for prod URL
5. [ENV-VARS.md](./ENV-VARS.md) + consumer Netlify env

Operator notes: `docs/setup.local/MY-DEPLOYMENT.md` (gitignored).
