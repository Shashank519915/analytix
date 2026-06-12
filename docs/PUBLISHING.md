# Publishing to npm

Analytix ships three **public** client packages on [npmjs.com](https://www.npmjs.com):

| Package | Purpose |
|---------|---------|
| `@analytix/core` | Types, validation, **`createAnalytixClient()`** |
| `@analytix/react` | React provider + trackers |
| `@analytix/dashboard` | Embeddable admin dashboard UI |
| `@analytix/tracker` | Vanilla JS `initAnalytix()` |

The platform app (`apps/web`) and `@analytix/db` stay in this repo — **not** published.

> **Note:** npm scopes must be **lowercase**. We use `@analytix/*` on npmjs (not `@Shashank519915/*`, which only worked on GitHub Packages).

---

## 1. npm account & scope

**Important:** `@analytix/core` requires an npm **organization** named `analytix`. Without it, publish fails with `404 Scope not found`.

1. Sign in at [npmjs.com](https://www.npmjs.com).
2. Profile menu → **Add an Organization**.
3. Name: **`analytix`** (this becomes the `@analytix` scope).
4. Plan: **Unlimited public packages** (free).
5. Enable **2FA** on your account (required to publish).

If the name `analytix` is taken, pick another org name (e.g. `analytixneo`) and rename packages to `@analytixneo/*` before publishing — or publish under your **user scope** (`@your-npm-username/core`) with no org setup.

Verify you're in the org: [npmjs.com/settings/analytix/members](https://www.npmjs.com/settings/analytix/members) (after creation).

---

## 2. Authenticate (publishers only)

npm **requires 2FA** (or a publish token that bypasses 2FA) to publish packages.

### Option A — Interactive login (one-time publish)

1. Enable **2FA** on [npmjs.com](https://www.npmjs.com) → Account → **Two-Factor Authentication** (Authorization and Publishing, or Authorization only).
2. Log in and enter your OTP when prompted:

```bash
npm login
# Username, password, email — then npm will ask for a one-time code from your authenticator app
```

3. Publish:

```bash
npm run publish:packages
```

If prompted again during publish, enter a fresh OTP from your authenticator.

### Option B — Automation token (CI / repeat publishes)

1. npm → **Access Tokens** → **Generate New Token** → type **Granular Access Token**.
2. Permissions: **Read and write** for packages (or the `@analytix` org if you created one).
3. Enable **Bypass two-factor authentication for publish** (required for non-interactive publish).
4. Set locally (do not commit):

```bash
# PowerShell
$env:NPM_TOKEN="npm_..."
```

Publisher `.npmrc` (local, gitignored):

```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

Then run `npm run publish:packages`.

**Consumers:** no `.npmrc` or token required. Optional explicit registry:

```
@analytix:registry=https://registry.npmjs.org/
```

---

## 3. Build and publish

```bash
cd analytics
npm install
npm run build
npm run db:backfill-origins   # optional: fix sites with empty allowed_origins
npm run publish:packages
```

Publish order: **core → react → dashboard → tracker**.

The publish script **skips versions already on npm** — safe to re-run after a partial publish.

**Current versions:**

| Package | Version |
|---------|---------|
| `@analytix/core` | 0.3.0 |
| `@analytix/react` | 0.3.0 |
| `@analytix/tracker` | 0.3.0 |
| `@analytix/dashboard` | 0.2.3 |

Publish a single package:

```bash
npm publish --access public -w @analytix/react
```

---

## 4. Install in a consumer project

```json
{
  "dependencies": {
    "@analytix/core": "^0.3.0",
    "@analytix/react": "^0.3.0",
    "@analytix/dashboard": "^0.2.3",
    "@analytix/tracker": "^0.3.0"
  }
}
```

```tsx
import { AnalytixProvider } from "@analytix/react";
import { AnalyticsDashboard } from "@analytix/dashboard";
import "@analytix/dashboard/styles.css";
```

Netlify/Vercel: no `NPM_TOKEN` needed.

---

## 5. GitHub Packages (legacy)

`@Shashank519915/analytix-*` on GitHub Packages is **deprecated**. Use `@analytix/*` on npmjs from `0.2.2` onward.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `403` … **cannot publish over the previously published versions** | That version already exists — bump `version` in `package.json` or re-run `npm run publish:packages` (skips existing versions) |
| `403` … **Two-factor authentication or granular access token with bypass 2fa** | Enable 2FA on npm, then `npm login` and publish interactively — **or** use a Granular token with **Bypass 2FA for publish** (see §2) |
| `404` … **Scope not found** | Create npm org **`analytix`** first (§1), then `npm login` as a member and re-run publish |
| `name can no longer contain capital letters` | Use `@analytix/*` lowercase scope on npmjs |
| `404` on install | Publish packages first; check [npmjs.com](https://www.npmjs.com/~analytix) |
| Netlify `401` GitHub registry | Remove GitHub `.npmrc`; use `@analytix/*` from npmjs |
