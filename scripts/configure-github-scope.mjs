#!/usr/bin/env node
/**
 * Renames @analytix/* packages to @YOUR_GITHUB_USER/analytix-* for GitHub Packages.
 * Usage: node scripts/configure-github-scope.mjs your-github-username
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const scope = process.argv[2];
if (!scope) {
  console.error("Usage: node scripts/configure-github-scope.mjs <github-username-or-org>");
  process.exit(1);
}

const packages = [
  { dir: "packages/core", short: "core" },
  { dir: "packages/react", short: "react" },
  { dir: "packages/dashboard", short: "dashboard" },
];

const nameMap = Object.fromEntries(
  packages.map((p) => [`@analytix/${p.short}`, `@${scope}/analytix-${p.short}`])
);

for (const pkg of packages) {
  const path = join(root, pkg.dir, "package.json");
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.name = `@${scope}/analytix-${pkg.short}`;
  if (json.repository?.url?.includes("YOUR_GITHUB_ORG")) {
    json.repository.url = json.repository.url.replace("YOUR_GITHUB_ORG", scope);
  }
  if (json.dependencies?.["@analytix/core"]) {
    json.dependencies[`@${scope}/analytix-core`] = json.dependencies["@analytix/core"];
    delete json.dependencies["@analytix/core"];
  }
  if (json.devDependencies?.["@analytix/core"]) {
    json.devDependencies[`@${scope}/analytix-core`] = json.devDependencies["@analytix/core"];
    delete json.devDependencies["@analytix/core"];
  }
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log("Updated", json.name);
}

console.log("\nScope configured. Next steps:");
console.log(`1. Copy .npmrc.example → .npmrc and set token`);
console.log(`2. npm run build:packages`);
console.log(`3. npm run publish:packages`);
console.log(`\nIn consumer apps (bluemint), install:`);
for (const pkg of packages) {
  console.log(`  @${scope}/analytix-${pkg.short}@^0.1.0`);
}
