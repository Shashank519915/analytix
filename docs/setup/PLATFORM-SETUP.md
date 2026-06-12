# Platform setup (Analytix operator guide)

Complete guide to running the Analytix platform locally and preparing it for production.

---

## What you are setting up

The **platform** is `analytics/apps/web` — a Next.js app that provides:

- Admin login / registration
- Multi-tenant **accounts** and **sites**
- Event ingestion API (`POST /api/v1/collect`)
- Summary + CSV export APIs
- Built-in dashboard at `/dashboard`

It uses its **own Neon Postgres database** — never share a CMS or app database.

---

## Prerequisites

- Node.js 20+
- A Neon (or Postgres) database dedicated to Analytix
- Git repo: `github.com/YOUR_GITHUB_USERNAME/analytix` (or your fork)

---

## Step 1 — Environment files

Create **both** of these with the same core values:

### `analytics/.env.local` (used by migrate/seed scripts)

```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET=your-long-random-string-min-32-chars
APP_URL=http://localhost:3001

# Optional — only for npm run db:seed (one-time local CLI)
SEED_EMAIL=admin@analytix.local
SEED_PASSWORD=YourStrongPassword123
SEED_SITE_NAME=My First Site
SEED_SITE_DOMAIN=example.com
```

### `analytics/apps/web/.env.local` (used by Next.js dev/build)

```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET=your-long-random-string-min-32-chars
APP_URL=http://localhost:3001
```

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Analytics-only Neon project |
| `JWT_SECRET` | Yes | Session signing; use `openssl rand -hex 32` |
| `APP_URL` | Yes | Public URL of this app (no trailing slash) |
| `SEED_*` | No | Only read by `npm run db:seed` on your machine |

**Seed vars are never needed on Netlify.** They only affect the local seed script.

---

## Step 2 — Install dependencies

```bash
cd analytics
npm install
```

---

## Step 3 — Database migration

Creates all tables (`accounts`, `sites`, `analytics_events`, rollups, rate limits):

```bash
npm run db:migrate
```

Reads `DATABASE_URL` from `analytics/.env.local`.

If migration fails with `relation "accounts" does not exist`, ensure you are on the latest `main` (migrate script strips SQL comments correctly).

---

## Step 4 — Seed (optional, first site + admin)

Creates an admin account and first **Site** (prints keys for consumer env):

```bash
npm run db:seed
```

**Save the output:**

```
Site created:
  id:              → ANALYTICS_SITE_ID / NEXT_PUBLIC_ANALYTICS_SITE_ID
  site_key:        → NEXT_PUBLIC_ANALYTICS_SITE_KEY  (sk_live_...)
  api_secret:      → ANALYTICS_API_SECRET            (sk_secret_...)
```

Re-running seed prints **Existing site** if one already exists.

### `SEED_SITE_DOMAIN`

Hostname only — **no** `https://`:

```env
SEED_SITE_DOMAIN=your-site.example.com
```

This sets site metadata and adds `https://` + `http://` to **allowed_origins** automatically.

---

## Step 5 — Run locally

```bash
npm run dev
```

Open http://localhost:3001

- Login with `SEED_EMAIL` / `SEED_PASSWORD`, or register a new account
- Dashboard → view sites, create new sites, copy keys

### Port already in use?

```powershell
netstat -ano | findstr :3001
taskkill /PID <pid> /F
```

Or run on another port:

```bash
cd apps/web && npx next dev --port 3002
```

Update consumer `ANALYTICS_API_URL` accordingly.

---

## Step 6 — Create additional sites (multi-project)

Each website you track is one **Site** in Analytix:

1. Log in to platform → **Dashboard → Create site**
2. Fill name, domain, allowed origins (one per line)
3. Copy Site ID, site key, api secret into **that project's** env vars

One platform, many consumers — each with its own keys.

---

## Production deploy

See [DEPLOY-NETLIFY.md](./DEPLOY-NETLIFY.md) for Netlify settings.

Production env (Analytix Netlify site only):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Same Neon URL as local |
| `JWT_SECRET` | Same as local |
| `APP_URL` | `https://your-analytix.example.com` |

After first deploy, set `APP_URL` to the real URL and redeploy.

---

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start platform on :3001 |
| `npm run build` | Full monorepo build (core → react → dashboard → db → web) |
| `npm run db:migrate` | Apply schema |
| `npm run db:seed` | Create admin + first site |
| `npm run build:packages` | Build publishable packages only |
| `npm run publish:packages` | Publish to GitHub Packages |

---

## Next steps

- [Connect a consumer site (Bluemint, etc.)](./CONSUMER-SETUP.md)
- [Netlify deploy checklist](./DEPLOY-NETLIFY.md)
- [Agent integration docs](../agents/README.md)
