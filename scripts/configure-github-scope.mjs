#!/usr/bin/env node
/**
 * DEPRECATED — GitHub Packages migration helper.
 * Analytix now publishes to npmjs as @analytix/* (see docs/PUBLISHING.md).
 * Do not run this unless you intentionally need GitHub Packages again.
 *
 * Renames @analytix/* publish packages to @YOUR_GITHUB_USER/analytix-* for GitHub Packages.
 * Updates monorepo scripts, workspace deps, and TypeScript imports.
 * Usage: node scripts/configure-github-scope.mjs your-github-username
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
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

function scoped(name) {
  return nameMap[name] ?? name;
}

function updateDeps(obj) {
  if (!obj) return;
  for (const oldName of Object.keys(nameMap)) {
    if (obj[oldName]) {
      obj[nameMap[oldName]] = obj[oldName];
      delete obj[oldName];
    }
  }
}

function replaceImports(content) {
  let out = content;
  for (const [oldName, newName] of Object.entries(nameMap)) {
    out = out.split(oldName).join(newName);
  }
  return out;
}

function walkTsFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".next") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walkTsFiles(path, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(path);
  }
  return files;
}

for (const pkg of packages) {
  const path = join(root, pkg.dir, "package.json");
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.name = `@${scope}/analytix-${pkg.short}`;
  if (json.repository?.url?.includes("YOUR_GITHUB_ORG")) {
    json.repository.url = json.repository.url.replace("YOUR_GITHUB_ORG", scope);
  }
  updateDeps(json.dependencies);
  updateDeps(json.devDependencies);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log("Updated", json.name);
}

for (const rel of ["packages/db/package.json", "apps/web/package.json"]) {
  const path = join(root, rel);
  const json = JSON.parse(readFileSync(path, "utf8"));
  updateDeps(json.dependencies);
  updateDeps(json.devDependencies);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log("Updated deps in", rel);
}

const rootPkgPath = join(root, "package.json");
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
rootPkg.scripts["build:packages"] =
  `npm run build -w @${scope}/analytix-core && npm run build -w @${scope}/analytix-react && npm run build -w @${scope}/analytix-dashboard`;
writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");
console.log("Updated root build:packages script");

const nextConfigPath = join(root, "apps/web/next.config.ts");
let nextConfig = readFileSync(nextConfigPath, "utf8");
nextConfig = replaceImports(nextConfig);
writeFileSync(nextConfigPath, nextConfig);
console.log("Updated apps/web/next.config.ts");

let importCount = 0;
for (const file of walkTsFiles(root)) {
  const content = readFileSync(file, "utf8");
  const updated = replaceImports(content);
  if (updated !== content) {
    writeFileSync(file, updated);
    importCount++;
  }
}
console.log(`Updated imports in ${importCount} source files`);

console.log("\nScope configured. Next steps:");
console.log(`1. Ensure .npmrc has @${scope}:registry=https://npm.pkg.github.com`);
console.log(`2. npm install`);
console.log(`3. npm run build:packages`);
console.log(`4. npm run publish:packages`);
console.log(`\nIn consumer apps (bluemint), install:`);
for (const pkg of packages) {
  console.log(`  @${scope}/analytix-${pkg.short}@^0.1.0`);
}
