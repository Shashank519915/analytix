# Analytix documentation

Analytix is a multi-tenant, first-party analytics platform. Host it once, connect many websites.

## Who this is for

| Audience | Start here |
|----------|------------|
| **Operator** — run platform, deploy, seed DB | [setup/PLATFORM-SETUP.md](./setup/PLATFORM-SETUP.md) |
| **Operator** — connect a consumer site | [setup/CONSUMER-SETUP.md](./setup/CONSUMER-SETUP.md) |
| **Operator** — deploy on Netlify | [setup/DEPLOY-NETLIFY.md](./setup/DEPLOY-NETLIFY.md) |
| **Your private deployment notes** | Copy [setup.local.example/](./setup.local.example/) → `docs/setup.local/` (gitignored) |
| **AI agents / developers** — integrate Analytix | [agents/README.md](./agents/README.md) |
| **Publish npm packages** | [PUBLISHING.md](./PUBLISHING.md) |

## Repository layout

```
analytics/
  packages/
    core/         @YOUR_GITHUB_USERNAME/analytix-core   (published)
    react/        @YOUR_GITHUB_USERNAME/analytix-react  (published)
    dashboard/    @YOUR_GITHUB_USERNAME/analytix-dashboard (published)
    db/           @analytix/db                          (platform only, not published)
  apps/
    web/          @analytix/web                         (hosted platform app)
  docs/
    setup/        Public operator guides
    setup.local.example/  Template for private operator notes
    agents/       Integration guides for coding agents
```

## Package scope

Run once after clone (or when forking):

```bash
node scripts/configure-github-scope.mjs YOUR_GITHUB_USERNAME
```

See [PUBLISHING.md](./PUBLISHING.md) for GitHub Packages auth and making packages **public** later.

## Quick operator checklist

1. [Platform setup](./setup/PLATFORM-SETUP.md)
2. [Deploy platform](./setup/DEPLOY-NETLIFY.md#analytix-platform-site)
3. [Connect consumer site](./setup/CONSUMER-SETUP.md)
4. Keep instance URLs/keys in `docs/setup.local/MY-DEPLOYMENT.md` (not committed)
