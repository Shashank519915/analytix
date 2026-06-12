# Framework integration guides — SDK v2

Analytix SDK v2 (`@analytix/core@0.3+`) uses a **plugin-based client** inspired by [DavidWells/analytics](https://github.com/DavidWells/analytics): `page`, `track`, `identify`, lifecycle hooks, offline queue, and debug mode.

---

## Core API

```typescript
import { createAnalytixClient } from "@analytix/core";

const client = createAnalytixClient({
  siteKey: "sk_live_...",
  collectUrl: "https://analytics.example.com/api/v1/collect",
  configUrl: "https://analytics.example.com/api/v1/config", // optional
  storagePrefix: "mysite",
  debug: true, // console logging via debug plugin
});

await client.ready();

await client.page({ path: "/pricing" });
await client.track("signup_clicked", { plan: "pro" });
await client.identify("user_123", { plan: "pro" });
client.grantConsent(); // when site has consent_required
```

Built-in plugins: **backend** (POST collect + offline queue), **debug** (when `debug: true`), **scroll depth** (when enabled in site config).

---

## Next.js App Router

```tsx
// layout.tsx
import { AnalytixProvider, AnalytixTrackerNext } from "@analytix/react";

export default function RootLayout({ children }) {
  return (
    <AnalytixProvider config={{ siteKey, collectUrl, configUrl }}>
      <AnalytixTrackerNext />
      {children}
    </AnalytixProvider>
  );
}
```

Custom events in a client component:

```tsx
"use client";
import { useAnalytixClient } from "@analytix/react";

export function SignupButton() {
  const analytics = useAnalytixClient();
  return (
    <button onClick={() => analytics.track("signup_start")}>Sign up</button>
  );
}
```

Proxy collect + config through your app (recommended) — see [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md).

---

## Vite / React SPA (no Next.js)

```tsx
import { AnalytixProvider, AnalytixTracker } from "@analytix/react";

// AnalytixTracker uses browser history when pathname prop is omitted
<AnalytixProvider config={config}>
  <AnalytixTracker />
  <App />
</AnalytixProvider>
```

---

## Vanilla JS / static HTML

```html
<script type="module">
  import { initAnalytix, exposeAnalytix } from "https://esm.sh/@analytix/tracker@0.3";

  const client = exposeAnalytix(
    initAnalytix({
      siteKey: "sk_live_...",
      collectUrl: "https://analytics.example.com/api/v1/collect",
      configUrl: "https://analytics.example.com/api/v1/config",
      autoPage: true,
    })
  );

  // window.analytix.track("cta_click", { id: "hero" });
</script>
```

Or via npm:

```bash
npm install @analytix/tracker
```

---

## Writing a plugin

```typescript
import type { AnalytixPlugin } from "@analytix/core";

const redactPlugin = (): AnalytixPlugin => ({
  name: "redact-emails",
  track(payload) {
    const email = payload.metadata?.email;
    if (typeof email === "string") {
      return {
        ...payload,
        metadata: { ...payload.metadata, email: "[redacted]" },
      };
    }
  },
});

createAnalytixClient({
  siteKey,
  collectUrl,
  plugins: [redactPlugin()],
});
```

Lifecycle hooks: `bootstrap`, `loaded`, `page`, `track`, `identify`. Return `false` from `page`/`track` to cancel an event.

---

## Migration from v0.2

| v0.2 | v0.3 |
|------|------|
| `trackPageView(config, path)` | `useAnalytixClient().page({ path })` |
| `trackCustomEvent(...)` | `client.track(name, props)` |
| `trackEngagement(...)` | `client.engagement(path, ms)` |
| Next-only `AnalytixTracker` | `AnalytixTrackerNext` or `AnalytixTracker` + `pathname` prop |

Legacy helpers in `@analytix/react` still work but are deprecated.
