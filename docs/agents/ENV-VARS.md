# Environment variables reference

## Analytix platform (`analytics/apps/web`)

Set on **platform** only (local `.env.local` + Analytix Netlify site).

| Variable | Required | Example (local) | Example (prod) | Notes |
|----------|----------|-----------------|----------------|-------|
| `DATABASE_URL` | Yes | Neon analytics URL | Same Neon URL | **Not** consumer CMS DB |
| `JWT_SECRET` | Yes | random 32+ chars | same | Session cookies |
| `APP_URL` | Yes | `http://localhost:3001` | `https://your-analytix.example.com` | No trailing slash |

### Seed-only (local CLI, never Netlify)

Read by `npm run db:seed` from `analytics/.env.local`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `SEED_EMAIL` | `admin@analytix.local` | First admin login |
| `SEED_PASSWORD` | `changeme123` | First admin password |
| `SEED_SITE_NAME` | `BlueMint Services` | First site label |
| `SEED_SITE_DOMAIN` | `bluemint.services` | Hostname only, no `https://` |

---

## Consumer site (Bluemint, etc.)

### Server-only (never `NEXT_PUBLIC_*`)

| Variable | Required | Local | Production |
|----------|----------|-------|------------|
| `ANALYTICS_API_URL` | Yes | `http://localhost:3001` | `https://your-analytix.example.com` |
| `ANALYTICS_SITE_ID` | Yes | UUID from seed/dashboard | Same UUID |
| `ANALYTICS_API_SECRET` | Yes | `sk_secret_...` | Same secret |

### Client (embedded in bundle — intentional)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_ANALYTICS_SITE_ID` | Yes | Same UUID as `ANALYTICS_SITE_ID` |
| `NEXT_PUBLIC_ANALYTICS_SITE_KEY` | Yes | `sk_live_...` — write-only public key |

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_ANALYTICS_COLLECT_URL` | `/api/analytics/collect` | Override collect endpoint |

---

## Netlify — consumer site only

| Variable | Purpose |
|----------|---------|
| `NPM_TOKEN` | GitHub PAT `read:packages` for `@YOUR_GITHUB_USERNAME/analytix-*` |
| `SECRETS_SCAN_OMIT_KEYS` | `CLOUDINARY_CLOUD_NAME,NEXT_PUBLIC_ANALYTICS_SITE_KEY,NEXT_PUBLIC_ANALYTICS_SITE_ID,ANALYTICS_SITE_ID` |

---

## Netlify — platform site only

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Analytics Neon |
| `JWT_SECRET` | Session signing |
| `APP_URL` | Public platform URL |

**No** `NPM_TOKEN` or `SEED_*` on platform Netlify.

---

## Local npm auth

Consumer `.npmrc`:

```
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

PowerShell before install:

```powershell
$env:NPM_TOKEN="ghp_xxxxxxxx"
```

Or store token in `C:\Users\<you>\.npmrc` (user-level).

---

## Security summary

| Secret? | Variables |
|---------|-----------|
| **Yes — server only** | `ANALYTICS_API_SECRET`, `JWT_SECRET`, `DATABASE_URL`, `NPM_TOKEN` |
| **Public by design** | `NEXT_PUBLIC_ANALYTICS_SITE_KEY` (like a write-only API key) |
| **Not secret but omit from scan** | `NEXT_PUBLIC_ANALYTICS_SITE_ID`, `ANALYTICS_SITE_ID` (UUIDs) |

Never commit `.env.local`. Commit `.env.example` with empty values.
