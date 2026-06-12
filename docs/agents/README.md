# Analytix — guide for AI coding agents

You are integrating **Analytix**, a hosted first-party analytics service. Read this folder before writing code.

## Start here

1. [OVERVIEW.md](./OVERVIEW.md) — mental model, components, decision tree
2. [INTEGRATE-NEXTJS.md](./INTEGRATE-NEXTJS.md) — step-by-step integration checklist
3. [ENV-VARS.md](./ENV-VARS.md) — every env var, local vs production
4. [API-REFERENCE.md](./API-REFERENCE.md) — platform HTTP API
5. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — known failures and fixes
6. [REFERENCE-IMPLEMENTATION.md](./REFERENCE-IMPLEMENTATION.md) — integration patterns

Operator setup (DB, deploy, seed): [../setup/PLATFORM-SETUP.md](../setup/PLATFORM-SETUP.md)

---

## Agent rules (read before coding)

### DO

- Use **separate** Analytix DB from the consumer app's CMS DB
- Store `api_secret` only in server env (`ANALYTICS_API_SECRET`) — never `NEXT_PUBLIC_*`
- Proxy collect + summary through consumer API routes (recommended)
- Install packages from `@YOUR_GITHUB_USERNAME/analytix-*` via GitHub Packages
- Add `transpilePackages` in consumer `next.config.ts`
- Set `ANALYTICS_API_URL` to the **hosted platform URL** in production (not `localhost`)
- Add `SECRETS_SCAN_OMIT_KEYS` for `NEXT_PUBLIC_ANALYTICS_SITE_KEY` on Netlify consumer deploys

### DO NOT

- Do not put `ANALYTICS_API_SECRET` in client code or `NEXT_PUBLIC_*`
- Do not point production `ANALYTICS_API_URL` at `localhost`
- Do not run `db:seed` env vars on Netlify — seed is local CLI only
- Do not skip building `@YOUR_GITHUB_USERNAME/analytix-core` before `@analytix/db` on platform deploy
- Do not use `file:../analytics/...` deps in production consumer apps — use published GitHub Packages
- Do not create analytics tables in the consumer app's database

---

## Quick decision tree

```
User wants analytics on a Next.js site?
│
├─ Platform already hosted? (e.g. https://your-analytix.example.com)
│   └─ YES → Create/find Site in dashboard → copy keys → integrate consumer (INTEGRATE-NEXTJS.md)
│
├─ Platform not hosted yet?
│   └─ Operator runs PLATFORM-SETUP.md + DEPLOY-NETLIFY.md first
│
├─ Admin UI preference?
│   ├─ Generic → @YOUR_GITHUB_USERNAME/analytix-dashboard component
│   ├─ Custom branded → build UI calling /api/admin/analytics proxy (see REFERENCE-IMPLEMENTATION.md)
│   └─ Central only → use platform /dashboard, skip embed
│
└─ Second website?
    └─ New Site in Analytix dashboard → new env keys in that project only
```

---

## Published packages (GitHub Packages)

| Package | Install | Purpose |
|---------|---------|---------|
| `@YOUR_GITHUB_USERNAME/analytix-core` | Optional in consumer | Types, validation |
| `@YOUR_GITHUB_USERNAME/analytix-react` | **Required** for tracking | Client SDK + React provider |
| `@YOUR_GITHUB_USERNAME/analytix-dashboard` | Optional | Embeddable admin charts |

Platform-only (never publish to consumer):

- `@analytix/db` — Postgres layer
- `@analytix/web` — hosted app in `apps/web`

---

## Example URLs (replace with yours)

| Service | URL |
|---------|-----|
| Platform | `https://your-analytix.example.com` |
| Consumer site | `https://your-consumer.example.com` |

Store your real URLs in `docs/setup.local/MY-DEPLOYMENT.md` (gitignored).
