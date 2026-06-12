# Deploy Analytix + consumers on Netlify

Checklist for production with two Netlify sites:

| Site | Repo | URL (example) |
|------|------|---------------|
| Analytix platform | `YOUR_GITHUB_USERNAME/analytix` | https://your-analytix.example.com |
| Consumer site | your consumer repo | https://your-consumer.example.com |

---

## Analytix platform site

### Netlify settings

| Setting | Value |
|---------|--------|
| Repository | `YOUR_GITHUB_USERNAME/analytix` |
| Base directory | `apps/web` |
| Build command | `cd ../.. && npm install && npm run build` |
| Publish directory | `.next` |

Configured in repo root `analytics/netlify.toml`.

**Important:** Build must run `npm run build` (full monorepo), not only `@analytix/db`. Core packages must compile first or TypeScript fails on fresh clones.

### Environment variables

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | Analytics Neon URL | Same DB as local |
| `JWT_SECRET` | Long random string | Same as local |
| `APP_URL` | `https://your-analytix.example.com` | Set after first deploy, then redeploy |

**Do not set:** `SEED_*`, `NPM_TOKEN` (not needed — uses workspace packages from repo).

### After deploy

1. Open platform URL → login
2. Confirm your consumer site appears in dashboard
3. Optionally create additional sites for other projects

---

## Consumer site (any Next.js app)

### Environment variables

| Key | Value |
|-----|-------|
| `NPM_TOKEN` | **Not needed** — `@analytix/*` is public on npmjs |
| `ANALYTICS_API_URL` | `https://your-analytix.example.com` |
| `ANALYTICS_SITE_ID` | UUID from seed/dashboard |
| `ANALYTICS_API_SECRET` | `sk_secret_...` |
| `NEXT_PUBLIC_ANALYTICS_SITE_ID` | Same UUID |
| `NEXT_PUBLIC_ANALYTICS_SITE_KEY` | `sk_live_...` |
| `SECRETS_SCAN_OMIT_KEYS` | See below |
| *(your app vars)* | `DATABASE_URL`, `ADMIN_PASSWORD`, Cloudinary, etc. |

### Secrets scanning (required for consumers using NEXT_PUBLIC_* keys)

`NEXT_PUBLIC_ANALYTICS_SITE_KEY` is embedded in the client bundle by design. Tell Netlify not to fail the build:

In `netlify.toml`:

```toml
[build.environment]
  SECRETS_SCAN_OMIT_KEYS = "CLOUDINARY_CLOUD_NAME,NEXT_PUBLIC_ANALYTICS_SITE_KEY,NEXT_PUBLIC_ANALYTICS_SITE_ID,ANALYTICS_SITE_ID"
```

Or set the same value in Netlify UI → Environment variables.

### `.npmrc` in consumer repo (optional)

```
@analytix:registry=https://registry.npmjs.org/
```

No `NPM_TOKEN` required for public packages.

---

## End-to-end production test

```
[ ] https://your-analytix.example.com — login works
[ ] https://your-consumer.example.com — site loads
[ ] Browse 3–5 public pages on consumer site
[ ] Consumer admin → Analytics — data appears
[ ] Analytix dashboard — same site shows events
```

---

## Common deploy failures

| Error | Fix |
|-------|-----|
| `Cannot find module '@analytix/core'` on Analytix build | Use `npm run build` not `build -w @analytix/db` only |
| Bluemint secrets scan fails on `NEXT_PUBLIC_ANALYTICS_SITE_KEY` | Add `SECRETS_SCAN_OMIT_KEYS` |
| Bluemint prod analytics empty | `ANALYTICS_API_URL` must be platform URL, not `localhost` |
| `npm install` 404 on consumer | Run `npm install` after packages are published; check `@analytix/*` on npmjs |

See [../agents/TROUBLESHOOTING.md](../agents/TROUBLESHOOTING.md) for more.
