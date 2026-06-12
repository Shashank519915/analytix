# Framework integration guides — SDK v2

Analytix SDK v2 uses a **plugin-based client** inspired by [DavidWells/analytics](https://github.com/DavidWells/analytics): `page`, `track`, `identify`, lifecycle hooks, offline queue, and debug mode.

**Packages:** `@analytix/core@^0.3.1`, `@analytix/react@^0.3.1`, `@analytix/tracker@^0.3.0`, `@analytix/dashboard@^0.2.4`

---

## Core API

```typescript
import { createAnalytixClient } from "@analytix/core";

const client = createAnalytixClient({
  siteKey: "sk_live_...",
  collectUrl: "https://analytics.example.com/api/v1/collect",
  configUrl: "https://analytics.example.com/api/v1/config", // optional
  storagePrefix: "mysite",
  debug: true,
});

await client.ready();

await client.page({ path: "/pricing" });
await client.track("signup_clicked", { plan: "pro" });
await client.identify("user_123", { plan: "pro" });
client.grantConsent();
```

**Fail closed:** if `configUrl` is set but fetch fails, tracking does not start until config loads successfully.

Built-in plugins: **backend** (POST + offline queue), **debug**, **scroll depth** (when enabled in site config).

---

## Next.js App Router (recommended)

```tsx
// AnalytixRoot.tsx — "use client"
import { AnalytixProvider, AnalytixTrackerNext, useAnalytixClient } from "@analytix/react";

export default function AnalytixRoot({ config }) {
  return (
    <AnalytixProvider config={config}>
      <AnalytixTrackerNext />
      {children}
    </AnalytixProvider>
  );
}
```

Custom events:

```tsx
"use client";
import { useAnalytixClient } from "@analytix/react";

export function SignupButton() {
  const analytics = useAnalytixClient();
  return <button onClick={() => analytics.track("signup_start")}>Sign up</button>;
}
```

Runtime / consent:

```tsx
import { useAnalytixRuntime } from "@analytix/react";

const { grantConsent, siteConfig, configReady } = useAnalytixRuntime();
```

Proxy collect + config through your app — [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md).

---

## Vite / React SPA

```tsx
import { AnalytixProvider, AnalytixTracker } from "@analytix/react";

<AnalytixProvider config={config}>
  <AnalytixTracker />
  <App />
</AnalytixProvider>
```

Pass `pathname` prop if not using browser history routing.

---

## Vanilla JS

```bash
npm install @analytix/tracker
```

```typescript
import { initAnalytix, exposeAnalytix } from "@analytix/tracker";

const client = exposeAnalytix(
  initAnalytix({
    siteKey: "sk_live_...",
    collectUrl: "https://.../api/v1/collect",
    configUrl: "https://.../api/v1/config",
    autoPage: true,
  })
);
```

---

## Embeddable dashboard

```tsx
import { AnalyticsDashboard } from "@analytix/dashboard";
import "@analytix/dashboard/styles.css";

<AnalyticsDashboard
  siteId="uuid"
  summaryEndpoint="/api/admin/analytics"
  defaultTheme="system"
/>
```

Exports: `useDashboardTheme`, `DASHBOARD_THEME_LABELS`, `AnalyticsDashboardSkeleton`.

Theme cycles **Light → Dark → System**; stored in `localStorage` per `siteId`.

Host CSS variables: `--analytix-dash-ink`, `--analytix-dash-accent`, `--analytix-dash-surface`, etc.

---

## Writing a plugin

```typescript
import type { AnalytixPlugin } from "@analytix/core";

const redactPlugin = (): AnalytixPlugin => ({
  name: "redact-emails",
  track(payload) {
    // return false to cancel, or modified payload
  },
});

createAnalytixClient({ siteKey, collectUrl, plugins: [redactPlugin()] });
```

Hooks: `bootstrap`, `loaded`, `page`, `track`, `identify`.

---

## Migration from v0.2

| v0.2 | v0.3+ |
|------|-------|
| `trackPageView(config, path)` | `useAnalytixClient().page({ path })` |
| `trackCustomEvent(...)` | `client.track(name, props)` |
| `AnalytixTracker` only | **`AnalytixTrackerNext`** for App Router |
| Permissive config fail | **Fail closed** when config URL set |

Legacy helpers in `@analytix/react` may still exist but prefer `useAnalytixClient()`.
