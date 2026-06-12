# Analytix

Multi-tenant, first-party analytics platform. Host once, connect many websites via npm packages.

**Documentation:** [docs/README.md](./docs/README.md)

| I want to… | Read |
|------------|------|
| Set up platform (local + prod) | [docs/setup/PLATFORM-SETUP.md](./docs/setup/PLATFORM-SETUP.md) |
| Connect a Next.js site | [docs/setup/CONSUMER-SETUP.md](./docs/setup/CONSUMER-SETUP.md) |
| Deploy on Netlify | [docs/setup/DEPLOY-NETLIFY.md](./docs/setup/DEPLOY-NETLIFY.md) |
| Integrate as a coding agent | [docs/agents/README.md](./docs/agents/README.md) or [AGENTS.md](./AGENTS.md) |
| Publish npm packages | [docs/PUBLISHING.md](./docs/PUBLISHING.md) |
| My private deployment checklist | Copy [docs/setup.local.example/](./docs/setup.local.example/) → `docs/setup.local/` |

## Monorepo layout

```
analytics/
  packages/
    core/         @analytix/core       (published on npmjs)
    react/        @analytix/react
    dashboard/    @analytix/dashboard
    db/           @analytix/db         (platform only)
  apps/web/       Hosted platform
  docs/           Public guides + agents/
```

## Quick start (platform)

```bash
cd analytics
cp .env.example .env.local
# Set DATABASE_URL, JWT_SECRET, APP_URL in .env.local AND apps/web/.env.local

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3001 → login → copy site keys for consumer env.

Full guide: [docs/setup/PLATFORM-SETUP.md](./docs/setup/PLATFORM-SETUP.md)

## API overview

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/v1/collect` | Site key header | Ingest events |
| `GET /api/v1/config` | Site key header | Public SDK config |
| `GET /api/v1/sites/:id/summary` | Bearer api_secret | Dashboard data |

See [docs/agents/API-REFERENCE.md](./docs/agents/API-REFERENCE.md).
