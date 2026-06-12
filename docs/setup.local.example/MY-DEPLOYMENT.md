# My Analytix deployment (private — copy to docs/setup.local/)

Copy this folder to `docs/setup.local/` and fill in your values.  
**`docs/setup.local/` is gitignored** — never committed.

```powershell
mkdir docs\setup.local
copy docs\setup.local.example\MY-DEPLOYMENT.md docs\setup.local\MY-DEPLOYMENT.md
```

---

## My URLs

| Service | URL |
|---------|-----|
| Analytix platform | https://your-analytix.netlify.app |
| Consumer site (e.g. Bluemint) | https://your-site.netlify.app |

---

## Analytix Netlify env

| Key | My value |
|-----|----------|
| `DATABASE_URL` | (Neon analytics DB — keep private) |
| `JWT_SECRET` | (keep private) |
| `APP_URL` | https://your-analytix.netlify.app |

---

## Consumer Netlify env

| Key | My value |
|-----|----------|
| `ANALYTICS_API_URL` | https://your-analytix.netlify.app |
| `ANALYTICS_SITE_ID` | |
| `ANALYTICS_API_SECRET` | |
| `NEXT_PUBLIC_ANALYTICS_SITE_ID` | |
| `NEXT_PUBLIC_ANALYTICS_SITE_KEY` | |

---

## Site keys (from npm run db:seed)

```
Site ID:
Site key (sk_live_...):
API secret (sk_secret_...):
```

---

## Seed defaults used locally

```
SEED_EMAIL=
SEED_PASSWORD=
SEED_SITE_NAME=
SEED_SITE_DOMAIN=
```

---

## Notes

- 
