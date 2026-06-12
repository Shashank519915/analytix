# Publishing to GitHub Packages

Analytix ships three client packages for consumer websites:

| Package | Purpose |
|---------|---------|
| `@YOUR_SCOPE/analytix-core` | Types, validation, helpers |
| `@YOUR_SCOPE/analytix-react` | Client tracker + React provider |
| `@YOUR_SCOPE/analytix-dashboard` | Embeddable admin dashboard UI |

The platform app (`apps/web`) and `@analytix/db` stay in this repo — **not** published to npm.

The database schema (`packages/db/src/schema.sql`) **is** in the repo — required for self-hosters running `npm run db:migrate`.

---

## 1. Create the GitHub repo

```bash
cd analytics
git init
git add .
git commit -m "Analytix analytics platform"
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/analytix.git
git push -u origin main
```

---

## 2. Configure package scope

GitHub Packages requires the npm scope to match your GitHub username or org.

```bash
node scripts/configure-github-scope.mjs YOUR_GITHUB_USERNAME
```

This renames packages from `@analytix/*` to `@YOUR_GITHUB_USERNAME/analytix-*`.

---

## 3. Authenticate npm (publishers only)

Create a GitHub classic PAT with `write:packages` and `read:packages`.

```bash
cp .npmrc.example .npmrc
# PowerShell: $env:GITHUB_TOKEN="ghp_..."
```

Publisher `.npmrc`:

```
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

---

## 4. Build and publish

```bash
npm install
npm run build:packages
npm run publish:packages
```

Publish order is automatic: **core → react → dashboard**.

### Version bumps

Bump `"version"` in all three `packages/*/package.json` files (keep in sync), then publish again.

---

## 5. Install in a consumer project

### `package.json`

```json
{
  "dependencies": {
    "@YOUR_GITHUB_USERNAME/analytix-core": "^0.1.0",
    "@YOUR_GITHUB_USERNAME/analytix-react": "^0.1.0",
    "@YOUR_GITHUB_USERNAME/analytix-dashboard": "^0.1.0"
  }
}
```

### Imports

```tsx
import { AnalytixProvider } from "@YOUR_GITHUB_USERNAME/analytix-react";
import { AnalyticsDashboard } from "@YOUR_GITHUB_USERNAME/analytix-dashboard";
import "@YOUR_GITHUB_USERNAME/analytix-dashboard/styles.css";
```

See [setup/CONSUMER-SETUP.md](./setup/CONSUMER-SETUP.md) for full wiring.

---

## 6. Consumer `.npmrc` — public vs private packages

### Public packages (recommended for open source)

After making packages **public** on GitHub (section 8), consumers only need the scope line:

```
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
```

**No `NPM_TOKEN` required** for `npm install` or CI/Netlify builds.

Remove `NPM_TOKEN` from Netlify/Vercel env vars if you previously added it.

### Private packages

```
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Set `NPM_TOKEN` (PAT with `read:packages`) in CI and local env.

---

## 7. Local monorepo development

While developing platform + consumer on the same machine, use `file:` links:

```json
"@YOUR_GITHUB_USERNAME/analytix-core": "file:../analytics/packages/core",
"@YOUR_GITHUB_USERNAME/analytix-react": "file:../analytics/packages/react",
"@YOUR_GITHUB_USERNAME/analytix-dashboard": "file:../analytics/packages/dashboard"
```

```bash
cd analytics && npm run build:packages
cd ../your-consumer-app && npm install && npm run dev
```

---

## 8. CI publish (optional)

GitHub Action on tag `v*`:

```yaml
- run: npm run build:packages
- run: npm run publish:packages
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 9. Making packages public

1. GitHub → **Packages** → select each package → **Package settings** → **Change visibility** → **Public**
2. Repeat for `analytix-core`, `analytix-react`, `analytix-dashboard`

After public:

| Who | Needs token? |
|-----|----------------|
| **Consumers** installing packages | No |
| **You** publishing new versions | Yes (`GITHUB_TOKEN` / PAT with `write:packages`) |
| **Netlify/Vercel** consumer builds | No (scope-only `.npmrc`) |

Consumers still need the registry scope in `.npmrc` so npm knows where to find `@YOUR_GITHUB_USERNAME/*`.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `403 Forbidden` on publish | PAT needs `write:packages`; repo under same owner as scope |
| `404` on install | `.npmrc` scope must match package name; check package is public |
| Empty token errors on CI | Remove `//npm.pkg.github.com/:_authToken=...` when packages are public |
| Consumer can't resolve package | Ensure `transpilePackages` in `next.config.ts` |
| `file:` link fails on Windows | Use published packages instead |

See also [setup/CONSUMER-SETUP.md](./setup/CONSUMER-SETUP.md) and [agents/TROUBLESHOOTING.md](./agents/TROUBLESHOOTING.md).
