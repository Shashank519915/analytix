# Reference implementation patterns

Generic patterns for a production-quality Analytix consumer integration.  
Adapt file paths to your project structure.

---

## Integration styles

| Style | When to use |
|-------|-------------|
| **Custom admin dashboard** | Branded UI, site-specific filters (blog picker, skeleton, extra cards) |
| **Embeddable package** | Fast setup, generic UI — `@YOUR_GITHUB_USERNAME/analytix-dashboard` |
| **Platform UI only** | No embed — link admins to `{APP_URL}/dashboard` |

---

## Recommended file map (Next.js App Router)

| File | Role |
|------|------|
| `src/lib/analytix-config.ts` | Server/client env helpers |
| `src/components/analytics/AnalytixLoader.tsx` | Server wrapper for tracker |
| `src/components/analytics/AnalytixRoot.tsx` | Client `AnalytixProvider` + `AnalytixTracker` |
| `src/app/layout.tsx` | Mount `AnalytixLoader` |
| `src/app/api/analytics/collect/route.ts` | Collect proxy (optional content enrichment) |
| `src/app/api/admin/analytics/route.ts` | Summary proxy (protect with admin auth) |
| `src/app/api/admin/analytics/export/route.ts` | CSV proxy |
| `src/app/admin/.../analytics/page.tsx` | Admin UI |
| `next.config.ts` | `transpilePackages` for analytix packages |
| `.npmrc` | GitHub Packages scope + `${NPM_TOKEN}` |
| `.env.example` | Document all `ANALYTICS_*` vars |

---

## Collect proxy pattern

```typescript
// Minimal proxy — extend for CMS enrichment (content_id, view counts, etc.)
const upstream = await fetch(`${config.apiUrl}/api/v1/collect`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Analytix-Site-Key": config.siteKey,
  },
  body: JSON.stringify(body),
});
```

Server-side proxy avoids CORS issues and keeps secrets off the client.

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

Always append `compare=1` for period deltas unless the UI opts out.

---

## Custom vs embeddable dashboard

**Embeddable (3 lines):**

```tsx
<AnalyticsDashboard
  siteId={process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID!}
  summaryEndpoint="/api/admin/analytics"
  exportEndpoint="/api/admin/analytics/export"
  loadingFallback={<YourSkeleton />}
/>
```

**Custom:** fetch `/api/admin/analytics?range=7d&...`, render with your design system, use skeleton while loading.

---

## Agent workflow

1. [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md) — checklist
2. Implement proxy routes + tracker
3. Choose dashboard style
4. [ENV-VARS.md](./ENV-VARS.md) + [../setup/DEPLOY-NETLIFY.md](../setup/DEPLOY-NETLIFY.md) for production

Operator instance notes (URLs, keys): `docs/setup.local/MY-DEPLOYMENT.md` (gitignored).
