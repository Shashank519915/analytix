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
| **Product roadmap & upgrades** | [planning/PRODUCT-ROADMAP.md](./planning/PRODUCT-ROADMAP.md) |
| **Publish npm packages** | [PUBLISHING.md](./PUBLISHING.md) |

## Repository layout

```
analytics/
  packages/
    core/         @analytix/core       (published on npmjs)
    react/        @analytix/react      (published on npmjs)
    dashboard/    @analytix/dashboard  (published on npmjs)
    db/           @analytix/db         (platform only, not published)
  apps/
    web/          @analytix/web        (hosted platform app)
  docs/
    setup/        Public operator guides
    setup.local.example/  Template for private operator notes
    setup.local/  Your private URLs/keys (gitignored — create from example)
    agents/       Integration guides for coding agents
```

## Published packages (npmjs)

Consumer apps install from [npmjs.com](https://www.npmjs.com/org/analytix):

| Package | Version (repo / target) | On npmjs (Jun 2026) |
|---------|-------------------------|---------------------|
| `@analytix/core` | **^0.3.1** | 0.3.0 → publish 0.3.1 |
| `@analytix/react` | **^0.3.1** | 0.3.0 → publish 0.3.1 |
| `@analytix/dashboard` | **^0.2.4** | 0.2.3 → publish 0.2.4 |
| `@analytix/tracker` | ^0.3.0 | 0.3.0 |

No GitHub token or `.npmrc` auth required for public installs. Optional `.npmrc`: `@analytix:registry=https://registry.npmjs.org/`

Publish new versions: [PUBLISHING.md](./PUBLISHING.md). Agent integration: [agents/README.md](./agents/README.md).

## Quick operator checklist

1. [Platform setup](./setup/PLATFORM-SETUP.md)
2. [Deploy platform](./setup/DEPLOY-NETLIFY.md#analytix-platform-site)
3. [Connect consumer site](./setup/CONSUMER-SETUP.md)
4. Keep instance URLs/keys in `docs/setup.local/MY-DEPLOYMENT.md` (not committed)
