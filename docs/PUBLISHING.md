# Publishing to GitHub Packages

Analytix ships three client packages you install in sites like Bluemint:

| Package | Purpose |
|---------|---------|
| `@YOUR_SCOPE/analytix-core` | Types, validation, helpers |
| `@YOUR_SCOPE/analytix-react` | Client tracker + React provider |
| `@YOUR_SCOPE/analytix-dashboard` | Embeddable admin dashboard UI |

The platform app (`apps/web`) and `@analytix/db` stay in this repo — not published to npm.

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
cd analytics
node scripts/configure-github-scope.mjs YOUR_GITHUB_USERNAME
```

This renames packages from `@analytix/*` to `@YOUR_GITHUB_USERNAME/analytix-*`.

---

## 3. Authenticate npm

Create a GitHub classic PAT with `write:packages` and `read:packages`.

```bash
cp .npmrc.example .npmrc
# Edit .npmrc — replace YOUR_GITHUB_USERNAME
# Set token: export GITHUB_TOKEN=ghp_...   (PowerShell: $env:GITHUB_TOKEN="ghp_...")
```

`.npmrc` contents:

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

Or publish individually:

```bash
npm run build -w @YOUR_GITHUB_USERNAME/analytix-core
npm publish -w @YOUR_GITHUB_USERNAME/analytix-core
# repeat for react, dashboard (core must be published first)
```

### Version bumps

Before each release, bump versions in all three `package.json` files (keep them in sync):

```json
"version": "0.1.1"
```

Then publish again.

---

## 5. Install in Bluemint (or any consumer)

In `bluemint/.npmrc`:

```
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

In `bluemint/package.json`:

```json
{
  "dependencies": {
    "@YOUR_GITHUB_USERNAME/analytix-core": "^0.1.0",
    "@YOUR_GITHUB_USERNAME/analytix-react": "^0.1.0",
    "@YOUR_GITHUB_USERNAME/analytix-dashboard": "^0.1.0"
  }
}
```

Update imports in Bluemint:

```tsx
import { AnalytixProvider } from "@YOUR_GITHUB_USERNAME/analytix-react";
import { AnalyticsDashboard } from "@YOUR_GITHUB_USERNAME/analytix-dashboard";
import "@YOUR_GITHUB_USERNAME/analytix-dashboard/styles.css";
```

Remove `file:../analytics/packages/*` dependencies when using published packages.

```bash
cd bluemint
npm install
npm run build
```

---

## 6. Local development (before publishing)

While developing both repos on the same machine, use `file:` links:

```json
"@analytix/core": "file:../analytics/packages/core",
"@analytix/react": "file:../analytics/packages/react",
"@analytix/dashboard": "file:../analytics/packages/dashboard"
```

Build packages first:

```bash
cd analytics && npm run build:packages
cd ../bluemint && npm install && npm run dev
```

---

## 7. CI publish (optional)

GitHub Action on tag `v*`:

```yaml
- run: npm run build:packages
- run: npm run publish:packages
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 8. Making packages public (recommended for open source)

By default GitHub Packages are **private** — consumers need `NPM_TOKEN` with `read:packages`.

To make packages installable without auth:

1. GitHub → each package page → **Package settings** → **Change visibility** → **Public**
2. Or repo **Settings → Actions → General → Packages** (org policies may apply)

After public:

- Consumers still use `@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com` in `.npmrc`
- They **do not** need `NPM_TOKEN` for `npm install` of public packages
- `publishConfig.access` in `package.json` can stay `restricted` for publish; visibility is set on GitHub UI

Alternatively publish to [npmjs.org](https://www.npmjs.com) with a scope you own — update `publishConfig.registry` and `configure-github-scope.mjs` accordingly.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `403 Forbidden` on publish | PAT needs `write:packages`; repo must exist under same owner as scope |
| `404` on install | `.npmrc` scope must match package name scope |
| Bluemint can't resolve package | Run `npm run build:packages` before `npm install` when using `file:` |
| Windows Turbopack path errors | Use published packages or `file:` + `dist/` exports (no absolute path aliases) |

See also [INTEGRATION.md](./INTEGRATION.md).
