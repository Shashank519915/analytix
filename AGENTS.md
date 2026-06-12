# Analytix — agent instructions

When integrating or modifying Analytix, read these docs **in order**:

1. [docs/agents/README.md](./docs/agents/README.md) — rules and decision tree
2. [docs/agents/INTEGRATE-NEXTJS.md](./docs/agents/INTEGRATE-NEXTJS.md) — integration checklist
3. [docs/agents/ENV-VARS.md](./docs/agents/ENV-VARS.md) — environment variables
4. [docs/agents/API-REFERENCE.md](./docs/agents/API-REFERENCE.md) — HTTP API
5. [docs/agents/TROUBLESHOOTING.md](./docs/agents/TROUBLESHOOTING.md) — common errors

**Reference patterns:** [docs/agents/REFERENCE-IMPLEMENTATION.md](./docs/agents/REFERENCE-IMPLEMENTATION.md)

**Operator setup:** [docs/setup/PLATFORM-SETUP.md](./docs/setup/PLATFORM-SETUP.md)

**Full doc index:** [docs/README.md](./docs/README.md)

## Hard constraints

- Never expose `ANALYTICS_API_SECRET` in client code
- Never use `localhost` for `ANALYTICS_API_URL` in production consumer env
- Platform deploy must run `npm run build` (full monorepo), not db-only build
- Consumer sites install `@YOUR_GITHUB_USERNAME/analytix-*` from GitHub Packages (or public registry when published)
- Operator-specific URLs/keys belong in `docs/setup.local/` (gitignored), not in committed docs

## Package scope

Replace `YOUR_GITHUB_USERNAME` with the repo owner's GitHub username (run `configure-github-scope.mjs` if needed). See [docs/PUBLISHING.md](./docs/PUBLISHING.md).
