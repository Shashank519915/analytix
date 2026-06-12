# Troubleshooting

## Platform build (Netlify / CI)

### `Cannot find module '@analytix/core'`

**Cause:** `@analytix/db` builds before `packages/core/dist` exists.

**Fix:** Use full monorepo build:

```bash
npm run build
```

Not:

```bash
npm run build -w @analytix/db && npm run build -w @analytix/web  # wrong order
```

`netlify.toml` should have:

```toml
command = "cd ../.. && npm install && npm run build"
```

---

### Migration: `relation "accounts" does not exist`

**Cause:** Old migrate script skipped `CREATE TABLE accounts` due to SQL comment parsing.

**Fix:** Pull latest `main`; run `npm run db:migrate` again.

---

### Seed: `ERR_MODULE_NOT_FOUND` for dist modules

**Cause:** Old seed imported compiled `@analytix/db` dist on Windows.

**Fix:** Latest seed is standalone (`packages/db/scripts/seed.mjs`). Run `npm run db:seed`.

---

## Consumer build (Netlify)

### Secrets scan fails on `NEXT_PUBLIC_ANALYTICS_SITE_KEY`

**Cause:** Site key is intentionally in client bundle; Netlify treats it as leaked secret.

**Fix:** Add to `netlify.toml` or Netlify UI:

```
SECRETS_SCAN_OMIT_KEYS=CLOUDINARY_CLOUD_NAME,NEXT_PUBLIC_ANALYTICS_SITE_KEY,NEXT_PUBLIC_ANALYTICS_SITE_ID,ANALYTICS_SITE_ID
```

---

### `404` installing `@analytix/*`

**Cause:** Packages not published yet, or wrong registry.

**Fix:**

- Confirm versions exist: `npm view @analytix/react version`
- Optional `.npmrc`: `@analytix:registry=https://registry.npmjs.org/`
- No `NPM_TOKEN` needed for public npmjs install

---

### `ETARGET` — No matching version for `@analytix/react@^0.3.1`

**Cause:** Consumer `package.json` requests a version not yet on npmjs (e.g. `^0.3.1` while npm still has `0.3.0`).

**Fix:**

1. In `analytics/`: `npm run build:packages && npm run publish:packages`
2. Verify: `npm view @analytix/core@0.3.1 version`
3. In consumer: `npm install`

Until publish completes, temporarily pin `^0.3.0` only if you do not need 0.3.1 fixes (fail-closed config, origins helpers).

---

### `Module not found: @analytix/react` (local)

**Cause:** Turbopack + `file:` symlinks on Windows, or missing install.

**Fix:** Use published packages from npmjs, or run `npm install` in consumer after publish.

---

## Runtime

### Production analytics empty; local works

**Cause:** `ANALYTICS_API_URL=http://localhost:3001` on Netlify consumer.

**Fix:** Set `ANALYTICS_API_URL=https://your-analytix.example.com` (your platform URL).

---

### Admin analytics 503 "Analytics not configured"

**Cause:** Missing any of `ANALYTICS_API_URL`, `ANALYTICS_SITE_ID`, `ANALYTICS_API_SECRET`, `NEXT_PUBLIC_ANALYTICS_SITE_KEY`.

**Fix:** Verify all env vars; restart dev server after `.env.local` changes.

---

### Collect returns 401 / 403

| Status | Cause | Fix |
|--------|-------|-----|
| 401 | Invalid site key | Match `NEXT_PUBLIC_ANALYTICS_SITE_KEY` to dashboard |
| 403 | Origin blocked | Add prod URL to site `allowed_origins` in Analytix dashboard |

Note: Bluemint proxy is server-to-server — origin check often skipped. Direct browser → platform calls need allowed origins.

---

### Summary returns 401

**Cause:** Wrong `ANALYTICS_API_SECRET` or `ANALYTICS_SITE_ID`.

**Fix:** Re-copy from Analytix dashboard or `npm run db:seed` output.

---

### Port 3001 already in use

```powershell
netstat -ano | findstr :3001
taskkill /PID <pid> /F
```

---

### Recharts warning: width(-1) height(-1)

**Cause:** `ResponsiveContainer` without explicit parent dimensions.

**Fix:** Wrap chart:

```tsx
<div style={{ width: "100%", height: 280, minHeight: 280 }}>
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>
```

Fixed in `@analytix/dashboard@0.2.2+`. Custom dashboards (Bluemint) already use `height={300}`.

---

## Workspace / npm

### `No workspaces found: --workspace=@analytix/core`

**Cause:** Running workspace commands from wrong directory or stale `package.json` scripts.

**Fix:** Use `npm run build:packages` or `npm run build` from root `package.json`.

---

## Getting keys again

```bash
cd analytics
npm run db:seed
```

Prints existing site keys if already seeded.

Or: log in to platform → Dashboard → select site → copy keys.
